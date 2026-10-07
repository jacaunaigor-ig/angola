from uuid import UUID

import jwt
import pytest
from app.main import create_app
from app.security import create_access_token
from app.settings import Settings
from pydantic import ValidationError


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
    assert "/api/dia-d/stream" in schema["paths"]
    assert "/api/dia-d/casos-juridicos" in schema["paths"]
    assert "/api/discursos/gerar" in schema["paths"]
    assert "/api/discursos/{speech_id}/status" in schema["paths"]
    assert "/api/planos" in schema["paths"]
    assert "/api/propostas" in schema["paths"]
    assert "/api/visitas/invalidar-lote" in schema["paths"]
    assert "/api/eleicoes/serie-historica" in schema["paths"]
    assert "/api/eleicoes/hondt-provincias" in schema["paths"]
    assert "/api/eleicoes/hondt-simulador" in schema["paths"]
    assert "/api/evidencias/presigned-upload" in schema["paths"]
    assert "/api/whatsapp/webhook" in schema["paths"]
    assert "/api/whatsapp/queixas" in schema["paths"]
    assert "/api/territorio/contorno-nacional" in schema["paths"]
    assert "/api/territorio/geo-angola" in schema["paths"]


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
    from uuid import uuid4

    from app.schemas import AtaSubmissionRequest, LegalCaseCreateRequest, SpeechGenerateRequest

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

    with pytest.raises(ValidationError):
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


def test_ed25519_custody_chain_and_signature():
    from uuid import uuid4

    from app.schemas import AtaSubmissionRequest

    from war_room.assinatura_eleitoral import (
        assinar_mensagem_ed25519,
        gerar_par_chaves_ed25519,
        montar_digest_canonico_ata,
        verificar_assinatura_ed25519,
    )

    priv_hex, pub_hex = gerar_par_chaves_ed25519()
    assert len(priv_hex) == 64
    assert len(pub_hex) == 64

    local_voto_id = "e0000000-0000-0000-0000-000000000001"
    foto_hash = "a" * 64
    timestamp = "2026-10-05T18:00:00Z"
    digest = montar_digest_canonico_ata(
        local_voto_id=local_voto_id,
        mesa_numero=1,
        votos_favoraveis=184,
        votos_oponentes=142,
        votos_nulos=6,
        votos_brancos=2,
        total_votantes=334,
        foto_hash_sha256=foto_hash,
        registado_em=timestamp,
        longitude=13.2667,
        latitude=-8.9167,
    )
    sig_hex = assinar_mensagem_ed25519(priv_hex, digest)
    assert len(sig_hex) == 128

    # Assinatura válida
    assert verificar_assinatura_ed25519(pub_hex, sig_hex, digest) is True

    # Adulteração de dados é detectada
    digest_adulterado = digest + b"_corrompido"
    assert verificar_assinatura_ed25519(pub_hex, sig_hex, digest_adulterado) is False

    # Validação do Schema Pydantic com campos Ed25519
    ata_req = AtaSubmissionRequest(
        id=uuid4(),
        local_voto_id=uuid4(),
        mesa_numero=1,
        votos_favoraveis=184,
        votos_oponentes=142,
        votos_nulos=6,
        votos_brancos=2,
        total_votantes=334,
        foto_hash_sha256=foto_hash,
        localizacao_envio={"longitude": 13.2667, "latitude": -8.9167},
        assinatura_digital_ed25519=sig_hex,
        chave_publica_delegado_ed25519=pub_hex,
    )
    assert ata_req.assinatura_digital_ed25519 == sig_hex
    assert ata_req.chave_publica_delegado_ed25519 == pub_hex

    # Assinatura com tamanho incorreto falha no validador regex
    with pytest.raises(ValidationError):
        AtaSubmissionRequest(
            id=uuid4(),
            local_voto_id=uuid4(),
            foto_hash_sha256=foto_hash,
            localizacao_envio={"longitude": 13.2667, "latitude": -8.9167},
            assinatura_digital_ed25519="assinatura_invalida_curta",
            chave_publica_delegado_ed25519=pub_hex,
        )


def test_canal_eleitor_recusa_caderno_e_agrega_queixa_sem_telefone():
    from app.routers import whatsapp as canal
    from fastapi.testclient import TestClient

    from war_room.canal_eleitor import carregar_assembleias_publicas, interpretar_mensagem

    locais = carregar_assembleias_publicas(canal.SEED)
    assert locais and all(item["proveniencia"] == "SIMULADO" for item in locais)

    recusa = interpretar_mensagem("o meu BI é 009876543LA", locais)
    assert recusa["intencao"] == "RECUSA_CADERNO"
    assert "não consulta" in recusa["resposta"]

    mesa = interpretar_mensagem("MESA Talatona", locais)
    assert mesa["intencao"] == "MESA"
    assert "SIMULADO" in mesa["resposta"]

    with canal._lock:
        canal._queixas.clear()
        canal._vistos.clear()

    settings = Settings(
        app_env="test",
        jwt_secret_key="a-long-test-secret-key-that-is-at-least-32-chars",
        cors_allowed_origins="http://localhost:3000",
    )
    client = TestClient(create_app(settings))
    verify = client.get(
        "/api/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "dev-eleitor-2027",
            "hub.challenge": "12345",
        },
    )
    assert verify.status_code == 200
    assert verify.text == "12345"

    telefone = "244923111222"
    resposta = client.post(
        "/api/whatsapp/webhook",
        json={
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "from": telefone,
                                        "id": "wamid.teste-1",
                                        "text": {"body": "QUEIXA agua Viana falta de agua na torneira"},
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        },
    )
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert telefone not in resposta.text
    assert corpo["respostas"][0]["para"] == "***222"

    fila = client.get("/api/whatsapp/queixas")
    assert fila.status_code == 200
    assert telefone not in fila.text
    agregado = fila.json()["agregado"]
    assert agregado[0]["municipio"] == "Viana"
    assert agregado[0]["categoria"] == "AGUA"


def test_ticket_de_evidencia_assinado_expira_e_isola_campanhas(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    from app import storage

    monkeypatch.setattr(storage, "STORAGE_ROOT", tmp_path)
    settings = Settings(
        app_env="test",
        jwt_secret_key="a-long-test-secret-key-that-is-at-least-32-chars",
        cors_allowed_origins="http://localhost:3000",
    )
    campanha = "a0000000-0000-0000-0000-000000000001"
    outra = "a0000000-0000-0000-0000-0000000000ff"

    def bearer(campaign_id: str) -> dict:
        token = create_access_token(
            {
                "id": UUID("d0000000-0000-0000-0000-000000000002"),
                "campanha_id": UUID(campaign_id),
                "ativista_id": UUID("b0000000-0000-0000-0000-000000000001"),
                "email": "field@example.test",
                "perfil": "BRIGADISTA",
            },
            settings,
        )
        return {"Authorization": f"Bearer {token}"}

    client = TestClient(create_app(settings))
    ticket = client.post(
        "/api/evidencias/presigned-upload",
        headers=bearer(campanha),
        json={
            "tipo": "ATA_APURAMENTO",
            "nome_arquivo": "ata.jpg",
            "mime_type": "image/jpeg",
            "tamanho_bytes": 4096,
            "sha256_esperado": "a" * 64,
        },
    )
    assert ticket.status_code == 200, ticket.text
    upload_url = ticket.json()["upload_url"]
    chave = ticket.json()["storage_key"]
    assert "signature=" in upload_url and "expires=" in upload_url

    # Sem assinatura: recusado. Assinatura adulterada: recusado.
    assert client.put(f"/api/evidencias/storage/{chave}", content=b"x").status_code == 422
    adulterado = upload_url.replace("signature=", "signature=00")
    assert client.put(adulterado, content=b"x").status_code == 403

    ok = client.put(upload_url, content=b"\xff\xd8\xff-ata")
    assert ok.status_code == 200, ok.text
    # Imutável: segundo envio com o mesmo ticket falha.
    assert client.put(upload_url, content=b"outra").status_code == 409

    # Leitura exige sessão e a mesma campanha.
    assert client.get(f"/api/evidencias/storage/{chave}").status_code == 401
    assert client.get(f"/api/evidencias/storage/{chave}", headers=bearer(outra)).status_code == 403
    lido = client.get(f"/api/evidencias/storage/{chave}", headers=bearer(campanha))
    assert lido.status_code == 200 and lido.content == b"\xff\xd8\xff-ata"

    # Travessia de diretório nunca sai do storage.
    expira, assinatura = storage.sign_upload_ticket(settings.jwt_secret_key, "atas/../../fora.txt")
    r = client.put(f"/api/evidencias/storage/atas/../../fora.txt?expires={expira}&signature={assinatura}", content=b"x")
    assert r.status_code in {400, 404}


def test_webhook_whatsapp_valida_assinatura_meta_e_fecha_painel_em_producao():
    import hashlib
    import hmac
    import json

    from fastapi.testclient import TestClient

    base = {
        "jwt_secret_key": "a-long-test-secret-key-that-is-at-least-32-chars",
        "cors_allowed_origins": "http://localhost:3000",
    }
    corpo = json.dumps({"entry": []}).encode()
    assinatura = "sha256=" + hmac.new(b"segredo-meta", corpo, hashlib.sha256).hexdigest()
    cabecalhos = {"Content-Type": "application/json"}

    com_segredo = TestClient(create_app(Settings(app_env="test", whatsapp_app_secret="segredo-meta", **base)))
    assert com_segredo.post("/api/whatsapp/webhook", content=corpo, headers=cabecalhos).status_code == 403
    certo = {**cabecalhos, "X-Hub-Signature-256": assinatura}
    assert com_segredo.post("/api/whatsapp/webhook", content=corpo, headers=certo).status_code == 200

    producao = TestClient(create_app(Settings(app_env="production", **base)))
    # Sem segredo Meta, a produção recusa o webhook em vez de aceitar tráfego não autenticado.
    assert producao.post("/api/whatsapp/webhook", content=corpo, headers=cabecalhos).status_code == 503
    assert producao.get("/api/whatsapp/queixas").status_code == 401
    assert producao.post("/api/whatsapp/simular", json={"texto": "AJUDA"}).status_code == 404


def test_limite_de_requisicoes_responde_429_e_rotas_sensiveis_exigem_sessao():
    from fastapi.testclient import TestClient

    settings = Settings(
        app_env="test",
        jwt_secret_key="a-long-test-secret-key-that-is-at-least-32-chars",
        cors_allowed_origins="http://localhost:3000",
        rate_limit_per_minute=3,
    )
    client = TestClient(create_app(settings))

    # Sem token, a invalidação de lote nunca chega ao banco.
    sem_sessao = client.post("/api/visitas/invalidar-lote", json={"uuids": ["x"]})
    assert sem_sessao.status_code == 401

    estados = [client.get("/api/planos").status_code for _ in range(6)]
    assert 429 in estados
    limitado = client.get("/api/planos")
    assert limitado.status_code == 429
    assert limitado.headers["Retry-After"] == "60"
    assert limitado.json()["sucesso"] is False


def test_contorno_nacional_e_arquivos_geo_angola():
    import json
    from pathlib import Path

    from fastapi.testclient import TestClient

    root = Path(__file__).resolve().parents[2]
    geo_adm1 = root / "geo_angola" / "geoBoundaries-AGO-ADM1_simplified.geojson"
    contorno = root / "geo_angola" / "contorno_nacional.geojson"

    assert geo_adm1.is_file(), "geoBoundaries-AGO-ADM1_simplified.geojson deve existir na pasta geo_angola"
    assert contorno.is_file(), "contorno_nacional.geojson deve existir na pasta geo_angola"

    dados_adm1 = json.loads(geo_adm1.read_text(encoding="utf-8"))
    assert dados_adm1["type"] == "FeatureCollection"
    assert len(dados_adm1["features"]) == 18

    dados_contorno = json.loads(contorno.read_text(encoding="utf-8"))
    assert dados_contorno["type"] == "FeatureCollection"
    props = dados_contorno["features"][0]["properties"]
    assert props["shapeISO"] == "AGO"
    assert props["shapeName"] == "Angola"
    assert dados_contorno["features"][0]["geometry"]["type"] == "MultiPolygon"

    app = create_app(Settings(app_env="test", jwt_secret_key="secret-key-at-least-32-chars-long!", cors_allowed_origins="http://localhost:3000"))
    client = TestClient(app)
    res_contorno = client.get("/api/territorio/contorno-nacional")
    assert res_contorno.status_code == 200
    res_geo = client.get("/api/territorio/geo-angola?arquivo=simplificado")
    assert res_geo.status_code == 200
    assert len(res_geo.json()["features"]) == 18


def test_unidades_ancoram_geometria_geo_angola_sem_inventar_dpa2024():
    from fastapi.testclient import TestClient

    app = create_app(
        Settings(
            app_env="test",
            jwt_secret_key="secret-key-at-least-32-chars-long!",
            cors_allowed_origins="http://localhost:3000",
        )
    )
    client = TestClient(app)
    dpa2016 = client.get("/api/territorio/unidades?versao=DPA_2016_18P&formato=geojson")
    assert dpa2016.status_code == 200
    luanda = next(f for f in dpa2016.json()["features"] if f["properties"]["nome"] == "Luanda")
    assert luanda["geometry"]["type"] in {"Polygon", "MultiPolygon"}
    assert luanda["properties"]["geometria_fonte"] == "geo_angola"
    assert luanda["properties"]["proveniencia_geometria"] == "OFICIAL"
    assert luanda["properties"]["proveniencia_dados"] == "OFICIAL"

    dpa2024 = client.get("/api/territorio/unidades?versao=DPA_2024_21P&formato=geojson")
    assert dpa2024.status_code == 200
    assert len(dpa2024.json()["features"]) == 21
    icolo = next(f for f in dpa2024.json()["features"] if f["properties"]["nome"] == "Icolo e Bengo")
    assert icolo["geometry"]["type"] == "Point"
    assert icolo["properties"]["proveniencia_geometria"] == "SIMULADO"
    assert icolo["properties"]["proveniencia_dados"] == "SIMULADO"
    huambo = next(f for f in dpa2024.json()["features"] if f["properties"]["nome"] == "Huambo")
    assert huambo["geometry"]["type"] in {"Polygon", "MultiPolygon"}
    assert huambo["properties"]["geometria_fonte"] == "geo_angola"


def test_submissao_de_ata_grava_colunas_ed25519_no_insert():
    from pathlib import Path

    fonte = Path(__file__).resolve().parents[1] / "app" / "routers" / "legacy.py"
    texto = fonte.read_text(encoding="utf-8")
    assert "assinatura_ed25519" in texto
    assert "chave_publica_ed25519" in texto


def test_pubsub_de_atas_entrega_aos_subscritores():
    from app.events import cancelar, publicar_ata, subscrever

    canal = subscrever()
    try:
        publicar_ata({"tipo": "ata", "campanha_id": "demo"})
        evento = canal.get_nowait()
        assert evento["tipo"] == "ata"
        assert evento["campanha_id"] == "demo"
    finally:
        cancelar(canal)
