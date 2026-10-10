import hashlib
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Body, Depends, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from psycopg.types.json import Jsonb

from ..schemas import PresignedUploadRequest, VisitsSyncRequest
from ..security import require_roles
from ..settings import Settings, get_settings
from ..storage import (
    MAX_UPLOAD_BYTES,
    TICKET_TTL_SECONDS,
    campaign_of_key,
    resolve_storage_path,
    sign_upload_ticket,
    verify_upload_ticket,
)

router = APIRouter(prefix="/api", tags=["field-operations"])
field_user = require_roles("ADMIN", "COORDENADOR", "BRIGADISTA")

ANGOLA_BOUNDS = {"min_lon": 11.5, "max_lon": 24.5, "min_lat": -18.5, "max_lat": -4.3}


@router.post("/sincronizar-visitas")
def synchronize_visits(
    payload: VisitsSyncRequest,
    request: Request,
    user: Annotated[dict, Depends(field_user)],
):
    if str(payload.campanha_id) != user["campaign_id"]:
        raise HTTPException(status_code=403, detail="A campanha não corresponde ao token autenticado.")

    now = datetime.now(UTC)
    accepted_ids = [str(visit.id) for visit in payload.visitas]
    inserted = 0
    review_count = 0

    with request.app.state.db_pool.connection() as connection:
        with connection.transaction():
            connection.execute(
                "SELECT set_config('app.current_campanha_id', %s, true)",
                (str(payload.campanha_id),),
            )
            for visit in payload.visitas:
                activist = connection.execute(
                    """
                    SELECT id FROM ativistas
                    WHERE id = %s AND campanha_id = %s AND ativo = TRUE
                    """,
                    (visit.ativista_id, payload.campanha_id),
                ).fetchone()
                if not activist:
                    raise HTTPException(
                        status_code=422,
                        detail=f"O mobilizador da visita {visit.id} não está ativo nesta campanha.",
                    )
                if user["perfil"] != "ADMIN" and (
                    not user.get("ativista_id")
                    or str(visit.ativista_id) != user["ativista_id"]
                ):
                    raise HTTPException(
                        status_code=403,
                        detail="O utilizador não está associado ao mobilizador informado.",
                    )

                lon = visit.localizacao.longitude
                lat = visit.localizacao.latitude
                if visit.zona_eleitoral_id:
                    zone = connection.execute(
                        """
                        SELECT id
                        FROM unidades_territoriais
                        WHERE id = %s
                          AND geometria_delimitacao IS NOT NULL
                          AND ST_Covers(
                                geometria_delimitacao,
                                ST_SetSRID(ST_MakePoint(%s, %s), 4326)
                              )
                        """,
                        (visit.zona_eleitoral_id, lon, lat),
                    ).fetchone()
                    if not zone:
                        raise HTTPException(
                            status_code=422,
                            detail=f"A visita {visit.id} está fora da zona eleitoral atribuída.",
                        )
                elif not (
                    ANGOLA_BOUNDS["min_lon"] <= lon <= ANGOLA_BOUNDS["max_lon"]
                    and ANGOLA_BOUNDS["min_lat"] <= lat <= ANGOLA_BOUNDS["max_lat"]
                ):
                    raise HTTPException(
                        status_code=422,
                        detail=f"A visita {visit.id} está fora do território permitido.",
                    )

                reason = None
                if visit.registado_em > now + timedelta(minutes=15):
                    reason = "RELOGIO_APARELHO_FUTURO_SUSPEITO"
                elif visit.registado_em < now - timedelta(days=365):
                    reason = "TIMESTAMP_MUITO_ANTIGO"

                # Quantização de 3 casas decimais reduz a precisão espacial persistida (~100 m).
                lon_private = round(lon, 3)
                lat_private = round(lat, 3)
                result = connection.execute(
                    """
                    INSERT INTO visitas_terreno (
                        id, campanha_id, ativista_id, unidade_territorial_id, localizacao,
                        precisao_gps_metros, sentimento, dores_prioritarias, faixa_etaria,
                        observacoes, categoria_observacao, marcado_revisao_humana,
                        motivo_revisao, registado_em, sincronizado_em, sincronizado,
                        metadados_aparelho
                    ) VALUES (
                        %s, %s, %s, %s,
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
                        %s, %s::tipo_sentimento, %s::categoria_dor[], %s, %s, %s, %s, %s, %s,
                        clock_timestamp(), TRUE, %s
                    )
                    ON CONFLICT (id) DO NOTHING
                    RETURNING id
                    """,
                    (
                        visit.id,
                        payload.campanha_id,
                        visit.ativista_id,
                        visit.zona_eleitoral_id,
                        lon_private,
                        lat_private,
                        visit.precisao_gps_metros,
                        visit.sentimento,
                        visit.dores_prioritarias,
                        visit.faixa_etaria,
                        visit.observacoes,
                        visit.categoria_observacao or (
                            "REGISTO_NOTAS_GERAIS" if visit.observacoes else None
                        ),
                        reason is not None,
                        reason,
                        visit.registado_em,
                        Jsonb(visit.metadados_aparelho) if visit.metadados_aparelho else None,
                    ),
                ).fetchone()
                if result is None:
                    existing = connection.execute(
                        "SELECT campanha_id, ativista_id FROM visitas_terreno WHERE id = %s",
                        (visit.id,),
                    ).fetchone()
                    if (
                        not existing
                        or str(existing["campanha_id"]) != str(payload.campanha_id)
                        or str(existing["ativista_id"]) != str(visit.ativista_id)
                    ):
                        raise HTTPException(
                            status_code=409,
                            detail=f"O ID da visita {visit.id} já está associado a outro registo.",
                        )
                inserted += int(result is not None)
                review_count += int(reason is not None)

    return {
        "sucesso": True,
        "mensagem": "Lote processado de forma atómica.",
        "resumo": {
            "total_recebidas": len(payload.visitas),
            "total_novas_inseridas": inserted,
            "total_duplicadas_ignoradas": len(payload.visitas) - inserted,
            "total_marcadas_revisao_humana": review_count,
            "sincronizado_em": now.isoformat(),
        },
        "ids_inseridos": accepted_ids,
        "ids_confirmados": accepted_ids,
    }


@router.get("/visitas")
def list_visits(
    request: Request,
    user: Annotated[dict, Depends(require_roles("ADMIN", "ANALISTA", "COORDENADOR"))],
    campaign_id: str = Query(..., alias="campanha_id"),
    limit: int = Query(default=50, ge=1, le=200, alias="limite"),
    activist_id: str | None = Query(default=None, alias="ativista_id"),
):
    if campaign_id != user["campaign_id"]:
        raise HTTPException(status_code=403, detail="A campanha não corresponde ao token autenticado.")
    query = """
        SELECT id, ativista_id, ST_X(localizacao::geometry) AS longitude,
               ST_Y(localizacao::geometry) AS latitude, precisao_gps_metros,
               sentimento, dores_prioritarias, faixa_etaria, eleitor_jovem,
               marcado_revisao_humana, motivo_revisao, registado_em, sincronizado_em
        FROM visitas_terreno WHERE campanha_id = %s
    """
    params: list = [campaign_id]
    if activist_id:
        query += " AND ativista_id = %s"
        params.append(activist_id)
    query += " ORDER BY registado_em DESC LIMIT %s"
    params.append(limit)
    with request.app.state.db_pool.connection() as connection:
        connection.execute("SELECT set_config('app.current_campanha_id', %s, true)", (campaign_id,))
        rows = connection.execute(query, params).fetchall()
    return {"total": len(rows), "visitas": rows}


@router.post("/visitas/{visit_id}/evidencias", status_code=201)
def upload_visit_evidence(
    visit_id: str,
    request: Request,
    user: Annotated[dict, Depends(field_user)],
    evidence_id: str = Query(alias="id"),
    evidence: UploadFile = File(...),
):
    try:
        visit_uuid = UUID(visit_id)
        evidence_uuid = UUID(evidence_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="IDs de visita/evidência devem ser UUIDs.") from exc
    if evidence.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(status_code=415, detail="A evidência deve ser imagem JPEG ou PNG.")

    chunks = []
    size = 0
    while chunk := evidence.file.read(64 * 1024):
        size += len(chunk)
        if size > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Cada evidência está limitada a 5 MB.")
        chunks.append(chunk)
    content = b"".join(chunks)
    checksum = hashlib.sha256(content).hexdigest()

    with request.app.state.db_pool.connection() as connection:
        with connection.transaction():
            connection.execute(
                "SELECT set_config('app.current_campanha_id', %s, true)",
                (str(user["campaign_id"]),),
            )
            visit = connection.execute(
                "SELECT id FROM visitas_terreno WHERE id = %s AND campanha_id = %s",
                (visit_uuid, user["campaign_id"]),
            ).fetchone()
            if not visit:
                raise HTTPException(status_code=404, detail="Visita não encontrada na campanha autenticada.")
            existing = connection.execute(
                "SELECT campanha_id, visita_id, sha256 FROM evidencias_visitas WHERE id = %s",
                (evidence_uuid,),
            ).fetchone()
            if existing:
                if (
                    str(existing["campanha_id"]) != user["campaign_id"]
                    or str(existing["visita_id"]) != str(visit_uuid)
                    or existing["sha256"].strip() != checksum
                ):
                    raise HTTPException(status_code=409, detail="ID de evidência já utilizado com conteúdo diferente.")
                return {"sucesso": True, "id": evidence_id, "duplicada": True, "sha256": checksum}
            connection.execute(
                """
                INSERT INTO evidencias_visitas (
                    id, campanha_id, visita_id, mime_type, sha256, nome_arquivo, conteudo
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    evidence_uuid, user["campaign_id"], visit_uuid, evidence.content_type,
                    checksum, (evidence.filename or "evidencia")[:180], content,
                ),
            )
    return {"sucesso": True, "id": evidence_id, "duplicada": False, "sha256": checksum}


@router.post("/visitas/invalidar-lote")
def invalidate_visit_batch(
    request: Request,
    user: Annotated[dict, Depends(require_roles("ADMIN", "COORDENADOR"))],
    body: dict = Body(...),
    x_plano_campanha: str | None = Header(default=None),
    plano: str | None = Query(default=None),
):
    from .plans import exigir_funcionalidade, resolver_plano_request

    plano_codigo = resolver_plano_request(x_plano_campanha, plano or body.get("plano"))
    exigir_funcionalidade(plano_codigo, "invalidar_lote")

    uuids = body.get("uuids")
    if not isinstance(uuids, list) or not uuids:
        raise HTTPException(status_code=400, detail="Informe o array 'uuids' do lote a invalidar.")

    motivo = str(body.get("motivo") or "LOTE_INVALIDADO_COORDENACAO")
    responsavel = str(user.get("email") or body.get("responsavel") or "coordenacao_war_room")
    motivo_registado = f"{motivo} · por {responsavel}"[:500]

    with request.app.state.db_pool.connection() as connection:
        with connection.transaction():
            connection.execute(
                "SELECT set_config('app.current_campanha_id', %s, true)",
                (str(user["campaign_id"]),),
            )
            rows = connection.execute(
                """
                UPDATE visitas_terreno
                SET marcado_revisao_humana = TRUE,
                    motivo_revisao = %s
                WHERE id = ANY(%s::uuid[])
                RETURNING id
                """,
                (motivo_registado, [str(u) for u in uuids]),
            ).fetchall()

    return {
        "success": True,
        "sucesso": True,
        "message": "Lote invalidado pela coordenação. Registos preservados para auditoria.",
        "total_invalidados": len(rows),
        "uuids": [str(r["id"]) for r in rows],
    }


@router.get("/admin/ping")
def admin_ping(user: Annotated[dict, Depends(require_roles("ADMIN"))]):
    return {"status": "AUTHORIZED", "perfil": user["perfil"]}


@router.post("/evidencias/presigned-upload")
def request_presigned_upload(
    payload: PresignedUploadRequest,
    user: Annotated[dict, Depends(field_user)],
    settings: Annotated[Settings, Depends(get_settings)],
):
    """Gera um ticket de upload direto desacoplado do banco de dados (S3/R2 ou local de objetos)."""
    campaign_id = payload.campanha_id or UUID(user["campaign_id"])
    if str(campaign_id) != user["campaign_id"]:
        raise HTTPException(status_code=403, detail="A campanha não corresponde ao token autenticado.")

    subpasta = "atas" if payload.tipo == "ATA_APURAMENTO" else "visitas"
    file_id = uuid4().hex
    nome_sanitizado = "".join(c for c in payload.nome_arquivo if c.isalnum() or c in "._-")
    storage_key = f"{subpasta}/{campaign_id}/{file_id}_{nome_sanitizado}"

    expires, signature = sign_upload_ticket(settings.jwt_secret_key, storage_key)
    upload_url = f"/api/evidencias/storage/{storage_key}?expires={expires}&signature={signature}"
    public_url = f"/api/evidencias/storage/{storage_key}"

    return {
        "sucesso": True,
        "tipo": payload.tipo,
        "storage_key": storage_key,
        "upload_url": upload_url,
        "public_url": public_url,
        "mime_type": payload.mime_type,
        "sha256_esperado": payload.sha256_esperado,
        "expira_em_segundos": TICKET_TTL_SECONDS,
        "instrucao": "Envie o binário da imagem via método PUT diretamente para a upload_url antes de submeter a ata.",
    }


@router.put("/evidencias/storage/{file_key:path}")
async def upload_binary_storage(
    file_key: str,
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    expires: int = Query(...),
    signature: str = Query(...),
):
    """Recebe o binário só com ticket assinado e válido, e persiste no storage desacoplado."""
    verify_upload_ticket(settings.jwt_secret_key, file_key, expires, signature)
    destino = resolve_storage_path(file_key)
    if destino.exists():
        raise HTTPException(status_code=409, detail="Evidência já enviada; os ficheiros são imutáveis.")
    destino.parent.mkdir(parents=True, exist_ok=True)

    content = await request.body()
    if not content:
        raise HTTPException(status_code=400, detail="Corpo vazio.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="O arquivo excede o limite máximo de 5 MB.")

    digest = hashlib.sha256(content).hexdigest()
    with open(destino, "wb") as f:
        f.write(content)

    return {
        "sucesso": True,
        "storage_key": file_key,
        "tamanho_bytes": len(content),
        "sha256": digest,
    }


@router.get("/evidencias/storage/{file_key:path}")
def serve_binary_storage(
    file_key: str,
    user: Annotated[dict, Depends(require_roles("ADMIN", "ANALISTA", "COORDENADOR", "BRIGADISTA"))],
):
    """Serve a evidência só à campanha dona do ficheiro."""
    destino = resolve_storage_path(file_key)
    if campaign_of_key(file_key) != user["campaign_id"]:
        raise HTTPException(status_code=403, detail="A evidência pertence a outra campanha.")
    if not destino.is_file():
        raise HTTPException(status_code=404, detail="Arquivo de evidência não encontrado.")

    mime = "image/jpeg" if destino.suffix.lower() in {".jpg", ".jpeg"} else "image/png"
    return FileResponse(destino, media_type=mime)
