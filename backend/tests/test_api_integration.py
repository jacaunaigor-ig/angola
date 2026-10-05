from datetime import UTC, datetime
from uuid import uuid4

import psycopg
from conftest import ACTIVIST_ID, CAMPAIGN_ID, ZONE_ID, token_for


def test_postgres_transaction_commits_and_rolls_back(test_database_url):
    marker = uuid4()
    with psycopg.connect(test_database_url) as connection:
        connection.execute("CREATE TEMP TABLE IF NOT EXISTS transaction_probe (id uuid PRIMARY KEY)")
        with connection.transaction():
            connection.execute("INSERT INTO transaction_probe VALUES (%s)", (marker,))
        assert connection.execute("SELECT count(*) AS n FROM transaction_probe WHERE id = %s", (marker,)).fetchone()["n"] == 1
        try:
            with connection.transaction():
                connection.execute("INSERT INTO transaction_probe VALUES (%s)", (uuid4(),))
                raise RuntimeError("rollback probe")
        except RuntimeError:
            pass
        assert connection.execute("SELECT count(*) AS n FROM transaction_probe").fetchone()["n"] == 1


def test_health_checks_and_request_id(client):
    live = client.get("/health/live", headers={"X-Request-ID": "not-a-uuid"})
    assert live.status_code == 200
    assert live.json()["status"] == "LIVE"
    assert live.headers["x-request-id"] != "not-a-uuid"

    ready = client.get("/health/ready")
    assert ready.status_code == 200
    assert ready.json()["database"] == "CONNECTED"
    assert "postgis" in ready.json()
    assert client.get("/api/health").json()["base_dados"] == "CONECTADA"


def test_authentication_and_role_contracts(client):
    invalid = client.post(
        "/api/auth/token",
        json={"campanha_id": str(CAMPAIGN_ID), "email": "admin@example.test", "senha": "wrong"},
    )
    assert invalid.status_code == 401

    admin = token_for(client, "admin@example.test")
    field = token_for(client, "field@example.test")
    field_login = client.post(
        "/api/auth/token",
        json={"campanha_id": str(CAMPAIGN_ID), "email": "field@example.test", "senha": "test-password"},
    )
    assert field_login.json()["campanha_id"] == str(CAMPAIGN_ID)
    assert field_login.json()["ativista_id"] == str(ACTIVIST_ID)
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin}"}).json()["perfil"] == "ADMIN"
    assert client.get("/api/admin/ping", headers={"Authorization": f"Bearer {admin}"}).status_code == 200
    assert client.get("/api/admin/ping", headers={"Authorization": f"Bearer {field}"}).status_code == 403
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer invalid"}).status_code == 401


def test_sync_contract_idempotency_and_electoral_geofence(client):
    field_token = token_for(client, "field@example.test")
    headers = {"Authorization": f"Bearer {field_token}"}
    payload = {
        "campanha_id": str(CAMPAIGN_ID),
        "visitas": [{
            "id": str(uuid4()),
            "ativista_id": str(ACTIVIST_ID),
            "zona_eleitoral_id": str(ZONE_ID),
            "localizacao": {"longitude": 13.2667, "latitude": -8.9167},
            "sentimento": "NEUTRO",
            "dores_prioritarias": ["AGUA"],
            "faixa_etaria": "25-35",
            "registado_em": datetime.now(UTC).isoformat(),
        }],
    }
    first = client.post("/api/sincronizar-visitas", json=payload, headers=headers)
    assert first.status_code == 200, first.text
    assert first.json()["resumo"]["total_novas_inseridas"] == 1
    assert first.json()["ids_confirmados"] == [payload["visitas"][0]["id"]]

    retry = client.post("/api/sincronizar-visitas", json=payload, headers=headers)
    assert retry.status_code == 200
    assert retry.json()["resumo"]["total_duplicadas_ignoradas"] == 1

    outside = {**payload, "visitas": [{**payload["visitas"][0], "id": str(uuid4()), "localizacao": {"longitude": 13.5, "latitude": -8.9167}}]}
    denied = client.post("/api/sincronizar-visitas", json=outside, headers=headers)
    assert denied.status_code == 422

    invalid_schema = client.post(
        "/api/sincronizar-visitas",
        json={"campanha_id": str(CAMPAIGN_ID), "visitas": [{"sentimento": "MAYBE"}]},
        headers=headers,
    )
    assert invalid_schema.status_code == 422
