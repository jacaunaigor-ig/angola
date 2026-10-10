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


def _haversine_m(lon1, lat1, lon2, lat2):
    from math import atan2, cos, radians, sin, sqrt

    raio = 6_371_000
    dlon = radians(lon2 - lon1)
    dlat = radians(lat2 - lat1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * raio * atan2(sqrt(a), sqrt(1 - a))


def _texto(obj) -> str:
    import json

    return json.dumps(obj, ensure_ascii=False).lower()


def test_sync_lote_idempotente_jitter_privacidade_e_mesma_campanha(client):
    field_token = token_for(client, "field@example.test")
    admin_token = token_for(client, "admin@example.test")
    field = {"Authorization": f"Bearer {field_token}"}
    admin = {"Authorization": f"Bearer {admin_token}"}

    lon, lat = 13.26644, -8.91644
    ids = [str(uuid4()) for _ in range(3)]
    visitas = [
        {
            "id": vid,
            "ativista_id": str(ACTIVIST_ID),
            "zona_eleitoral_id": str(ZONE_ID),
            "localizacao": {"longitude": lon, "latitude": lat},
            "sentimento": "NEUTRO",
            "dores_prioritarias": ["AGUA"],
            "faixa_etaria": "25-35",
            "observacoes": "Casa sem água na rua.",
            "registado_em": datetime.now(UTC).isoformat(),
            "nome": "Maria Silva",
            "bi": "009988776LA041",
            "telefone": "+244923000000",
        }
        for vid in ids
    ]
    payload = {"campanha_id": str(CAMPAIGN_ID), "visitas": visitas}

    primeiro = client.post("/api/sincronizar-visitas", json=payload, headers=field)
    assert primeiro.status_code == 200, primeiro.text
    assert primeiro.json()["resumo"]["total_novas_inseridas"] == 3
    assert primeiro.json()["resumo"]["total_duplicadas_ignoradas"] == 0
    assert set(primeiro.json()["ids_confirmados"]) == set(ids)
    corpo = _texto(primeiro.json())
    assert "maria silva" not in corpo
    assert "009988776" not in corpo
    assert "+244923000000" not in corpo
    assert "bilhete" not in corpo

    repetido = client.post("/api/sincronizar-visitas", json=payload, headers=field)
    assert repetido.status_code == 200
    assert repetido.json()["resumo"]["total_novas_inseridas"] == 0
    assert repetido.json()["resumo"]["total_duplicadas_ignoradas"] == 3

    outra_campanha = client.post(
        "/api/sincronizar-visitas",
        json={**payload, "campanha_id": str(uuid4()), "visitas": [{**visitas[0], "id": str(uuid4())}]},
        headers=field,
    )
    assert outra_campanha.status_code == 403

    listagem = client.get(
        "/api/visitas",
        params={"campanha_id": str(CAMPAIGN_ID), "limite": 20},
        headers=admin,
    )
    assert listagem.status_code == 200
    gravadas = [v for v in listagem.json()["visitas"] if str(v["id"]) in ids]
    assert len(gravadas) == 3
    for visita in gravadas:
        assert visita["longitude"] == round(lon, 3)
        assert visita["latitude"] == round(lat, 3)
        jitter = _haversine_m(lon, lat, visita["longitude"], visita["latitude"])
        assert 0 < jitter <= 160
        for chave in visita:
            assert chave.lower() not in {"nome", "bi", "telefone", "bilhete", "nome_completo"}
    listagem_txt = _texto(listagem.json())
    assert "maria silva" not in listagem_txt
    assert "009988776" not in listagem_txt
    assert "+244923000000" not in listagem_txt

    brigadista_lista = client.get(
        "/api/visitas",
        params={"campanha_id": str(CAMPAIGN_ID)},
        headers=field,
    )
    assert brigadista_lista.status_code == 403
