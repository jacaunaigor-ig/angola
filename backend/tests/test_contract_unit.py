from uuid import UUID

import jwt
import pytest

from app.main import create_app
from app.security import create_access_token
from app.settings import Settings


def test_cors_rejects_wildcard_origin():
    with pytest.raises(ValueError, match="wildcard não é permitido"):
        Settings(cors_allowed_origins="*")


def test_access_token_is_scoped_to_campaign_and_activist():
    settings = Settings(
        app_env="test",
        jwt_secret_key="a-long-test-secret-key-that-is-at-least-32-chars",
        cors_allowed_origins="http://localhost:3000",
    )
    token = create_access_token(
        {
            "id": UUID("d0000000-0000-0000-0000-000000000002"),
            "campanha_id": UUID("a0000000-0000-0000-0000-000000000001"),
            "ativista_id": UUID("b0000000-0000-0000-0000-000000000001"),
            "email": "field@example.test",
            "perfil": "BRIGADISTA",
        },
        settings,
    )
    claims = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        issuer=settings.jwt_issuer,
    )
    assert claims["campaign_id"] == "a0000000-0000-0000-0000-000000000001"
    assert claims["ativista_id"] == "b0000000-0000-0000-0000-000000000001"
    assert claims["perfil"] == "BRIGADISTA"


def test_fastapi_contract_registers_health_auth_and_legacy_routes():
    settings = Settings(
        app_env="test",
        jwt_secret_key="a-long-test-secret-key-that-is-at-least-32-chars",
        cors_allowed_origins="http://localhost:3000",
    )
    schema = create_app(settings).openapi()
    assert "/health/live" in schema["paths"]
    assert "/health/ready" in schema["paths"]
    assert "/api/auth/token" in schema["paths"]
    assert "/api/sincronizar-visitas" in schema["paths"]
    assert "/api/dia-d/submeter-ata" in schema["paths"]
    assert "/api/dia-d/casos-juridicos" in schema["paths"]
    assert "/api/discursos/gerar" in schema["paths"]
    assert "/api/discursos/{speech_id}/status" in schema["paths"]
    assert "/api/planos" in schema["paths"]
    assert "/api/propostas" in schema["paths"]
    assert "/api/visitas/invalidar-lote" in schema["paths"]
    assert "/api/eleicoes/serie-historica" in schema["paths"]
    assert "/api/eleicoes/hondt-provincias" in schema["paths"]
    assert "/api/eleicoes/hondt-simulador" in schema["paths"]


def test_commercial_plans_entitlements_guard():
    from app.routers.plans import exigir_funcionalidade

    # NACIONAL tem tudo
    exigir_funcionalidade("NACIONAL", "dia_d")
    exigir_funcionalidade("NACIONAL", "casos_juridicos")
    exigir_funcionalidade("NACIONAL", "invalidar_lote")

    # PROVINCIAL tem dia_d e casos_juridicos
    exigir_funcionalidade("PROVINCIAL", "dia_d")
    exigir_funcionalidade("PROVINCIAL", "casos_juridicos")

    # MUNICIPAL nao tem dia_d nem casos_juridicos -> deve levantar 402
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        exigir_funcionalidade("MUNICIPAL", "dia_d")
    assert exc.value.status_code == 402

    with pytest.raises(HTTPException) as exc:
        exigir_funcionalidade("MUNICIPAL", "casos_juridicos")
    assert exc.value.status_code == 402


def test_schema_validations_and_sanitization():
    from app.schemas import AtaSubmissionRequest, LegalCaseCreateRequest, SpeechGenerateRequest
    from uuid import uuid4

    case = LegalCaseCreateRequest(
        titulo="Irregularidade no voto",
        descricao_fato="Constatada divergência na urna 04",
        tipo_irregularidade="GEOFENCE_EXCEDIDO",
    )
    assert case.prioridade == "ALTA"
    assert case.titulo == "Irregularidade no voto"

    speech_req = SpeechGenerateRequest(
        municipio="Viana",
    )
    assert speech_req.nome_partido == "Nosso Partido"
    assert speech_req.municipio == "Viana"

    with pytest.raises(Exception):
        # Invalid hash format
        AtaSubmissionRequest(
            id=uuid4(),
            local_voto_id=uuid4(),
            foto_hash_sha256="not-a-valid-sha256",
            localizacao_envio={"longitude": 13.2, "latitude": -8.9},
        )


def test_hondt_engine_angola_circles():
    from war_room.motor_hondt import simular_hondt_provincial

    # Huambo 2022: MPLA 3, UNITA 2
    res_huambo = simular_hondt_provincial(257500, 248890, 15610, "MPLA", "UNITA", assentos_circulo=5)
    assert res_huambo["assentos"]["MPLA"] == 3
    assert res_huambo["assentos"]["UNITA"] == 2
    assert res_huambo["disputa_proxima_cadeira"]["MPLA"]["votos_para_proximo_assento"] > 0

    # Luanda 2022: MPLA 2, UNITA 3
    res_luanda = simular_hondt_provincial(783100, 1471600, 96500, "MPLA", "UNITA", assentos_circulo=5)
    assert res_luanda["assentos"]["MPLA"] == 2
    assert res_luanda["assentos"]["UNITA"] == 3

    # Cabinda 2022: MPLA 1, UNITA 4
    res_cabinda = simular_hondt_provincial(47050, 122360, 9090, "MPLA", "UNITA", assentos_circulo=5)
    assert res_cabinda["assentos"]["MPLA"] == 1
    assert res_cabinda["assentos"]["UNITA"] == 4


def test_custo_logistico_and_priority_index():
    from war_room.custo_logistico import calcular_indice_prioridade_completo, obter_custo_logistico

    luanda_custo = obter_custo_logistico("Luanda")
    assert luanda_custo["fator_custo"] == 1.00
    assert luanda_custo["dificuldade_acesso"] == "BAIXA"

    cuando_custo = obter_custo_logistico("Cuando Cubango")
    assert cuando_custo["fator_custo"] == 4.40
    assert cuando_custo["dificuldade_acesso"] == "CRITICA"

    prio_luanda = calcular_indice_prioridade_completo(4652250, -29.28, 48.0, 67.0, "Luanda")
    prio_cuando = calcular_indice_prioridade_completo(250000, 35.0, 56.0, 58.0, "Cuando Cubango")

    assert prio_luanda["score_prioridade"] > prio_cuando["score_prioridade"]
    assert "Potencial" in prio_luanda["formula_aplicada"]
