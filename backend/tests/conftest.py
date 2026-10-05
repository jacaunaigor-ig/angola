import os
import sys
from pathlib import Path
from uuid import UUID

import bcrypt
import psycopg
import pytest
from fastapi.testclient import TestClient

# `app.py` at the repository root shares a name with the backend package.
backend_root = str(Path(__file__).resolve().parents[1])
if backend_root in sys.path:
    sys.path.remove(backend_root)
sys.path.insert(0, backend_root)

# Os testes não exportam telemetria: evita atrasos e ruído quando não há colector OTLP local.
os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = ""

from app.main import create_app
from app.settings import Settings

CAMPAIGN_ID = UUID("a0000000-0000-0000-0000-000000000001")
ACTIVIST_ID = UUID("b0000000-0000-0000-0000-000000000001")
ZONE_ID = UUID("c0000000-0000-0000-0000-000000000001")
ADMIN_ID = UUID("d0000000-0000-0000-0000-000000000001")
FIELD_ID = UUID("d0000000-0000-0000-0000-000000000002")


@pytest.fixture(scope="session")
def test_database_url():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Integração real requer TEST_DATABASE_URL apontando para um banco PostGIS isolado.")
    database_name = url.rsplit("/", 1)[-1].split("?", 1)[0]
    if not database_name.endswith("_test"):
        pytest.fail("TEST_DATABASE_URL deve apontar para um banco dedicado com sufixo _test.")
    return url


@pytest.fixture(scope="session")
def database_schema(test_database_url):
    with psycopg.connect(test_database_url, autocommit=True) as connection:
        connection.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        connection.execute("""
            DO $$ BEGIN CREATE TYPE tipo_sentimento AS ENUM ('POSITIVO', 'NEUTRO', 'NEGATIVO');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$
        """)
        connection.execute("""
            DO $$ BEGIN CREATE TYPE categoria_dor AS ENUM
            ('AGUA','ENERGIA','EMPREGO','SANEAMENTO','SAUDE','EDUCACAO','ESTRADAS','HABITACAO','SEGURANCA');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS campanhas (
                id uuid PRIMARY KEY, nome text NOT NULL DEFAULT 'Teste'
            );
            CREATE TABLE IF NOT EXISTS ativistas (
                id uuid PRIMARY KEY, campanha_id uuid NOT NULL REFERENCES campanhas(id),
                ativo boolean NOT NULL DEFAULT true
            );
            CREATE TABLE IF NOT EXISTS usuarios (
                id uuid PRIMARY KEY, campanha_id uuid NOT NULL REFERENCES campanhas(id),
                ativista_id uuid,
                nome text NOT NULL, email text NOT NULL, senha_hash text NOT NULL,
                perfil text NOT NULL, ativo boolean NOT NULL DEFAULT true
            );
            CREATE TABLE IF NOT EXISTS unidades_territoriais (
                id uuid PRIMARY KEY, nome text NOT NULL, nivel_territorial text NOT NULL,
                geometria_delimitacao geometry(Polygon, 4326)
            );
            CREATE TABLE IF NOT EXISTS locais_voto (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo_cne text,
                nome text NOT NULL, provincia text NOT NULL DEFAULT 'Luanda',
                municipio text NOT NULL, comuna_distrito text, bairro_aldeia text,
                total_mesas integer NOT NULL DEFAULT 1, total_eleitores_aptos integer NOT NULL DEFAULT 0,
                zonamento_historico text NOT NULL DEFAULT 'CAMPO_BATALHA',
                localizacao geography(Point, 4326) NOT NULL, criado_em timestamptz DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS visitas_terreno (
                id uuid PRIMARY KEY, campanha_id uuid NOT NULL REFERENCES campanhas(id),
                ativista_id uuid NOT NULL REFERENCES ativistas(id),
                unidade_territorial_id uuid REFERENCES unidades_territoriais(id),
                localizacao geography(Point, 4326) NOT NULL,
                precisao_gps_metros numeric, sentimento tipo_sentimento NOT NULL,
                dores_prioritarias categoria_dor[] NOT NULL DEFAULT '{}',
                faixa_etaria varchar(20), eleitor_jovem boolean GENERATED ALWAYS AS (faixa_etaria IN ('18-24','25-35')) STORED,
                observacoes text, categoria_observacao text, marcado_revisao_humana boolean DEFAULT false,
                motivo_revisao text, registado_em timestamptz NOT NULL, sincronizado_em timestamptz DEFAULT now(),
                sincronizado boolean DEFAULT true, metadados_aparelho jsonb
            )
        """)
        connection.execute("INSERT INTO campanhas (id) VALUES (%s) ON CONFLICT DO NOTHING", (CAMPAIGN_ID,))
        connection.execute(
            "INSERT INTO ativistas (id, campanha_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (ACTIVIST_ID, CAMPAIGN_ID),
        )
        connection.execute(
            """
            INSERT INTO unidades_territoriais (id, nome, nivel_territorial, geometria_delimitacao)
            VALUES (%s, 'Zona de teste', 'MUNICIPIO',
                ST_GeomFromText('POLYGON((13.24 -8.94, 13.29 -8.94, 13.29 -8.89, 13.24 -8.89, 13.24 -8.94))', 4326))
            ON CONFLICT (id) DO NOTHING
            """,
            (ZONE_ID,),
        )
        connection.execute(
            """
            INSERT INTO usuarios (id, campanha_id, nome, email, senha_hash, perfil)
            VALUES (%s, %s, 'Admin de teste', 'admin@example.test', %s, 'ADMIN')
            ON CONFLICT (id) DO UPDATE SET senha_hash = EXCLUDED.senha_hash
            """,
            (ADMIN_ID, CAMPAIGN_ID, bcrypt.hashpw(b"test-password", bcrypt.gensalt(rounds=4)).decode()),
        )
        connection.execute(
            """
            INSERT INTO usuarios (id, campanha_id, ativista_id, nome, email, senha_hash, perfil)
            VALUES (%s, %s, %s, 'Brigadista de teste', 'field@example.test', %s, 'BRIGADISTA')
            ON CONFLICT (id) DO UPDATE SET senha_hash = EXCLUDED.senha_hash
            """,
            (
                FIELD_ID, CAMPAIGN_ID, ACTIVIST_ID,
                bcrypt.hashpw(b"test-password", bcrypt.gensalt(rounds=4)).decode(),
            ),
        )
    yield
    with psycopg.connect(test_database_url, autocommit=True) as connection:
        connection.execute("DELETE FROM visitas_terreno WHERE campanha_id = %s", (CAMPAIGN_ID,))
        connection.execute("DELETE FROM usuarios WHERE id IN (%s, %s)", (ADMIN_ID, FIELD_ID))


@pytest.fixture
def client(test_database_url, database_schema):
    settings = Settings(
        app_name="angola-test-api",
        app_env="test",
        database_url=test_database_url,
        jwt_secret_key="a-long-test-secret-key-that-is-at-least-32-chars",
        cors_allowed_origins="http://localhost:3000",
        rate_limit_enabled=False,
    )
    with TestClient(create_app(settings)) as test_client:
        yield test_client


def token_for(client: TestClient, email: str):
    response = client.post(
        "/api/auth/token",
        json={"campanha_id": str(CAMPAIGN_ID), "email": email, "senha": "test-password"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]
