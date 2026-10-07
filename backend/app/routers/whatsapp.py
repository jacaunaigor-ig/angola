"""Webhook do canal WhatsApp do eleitor e fila de queixas para a sala de comando.

As queixas vão para PostgreSQL (`queixas_eleitor`) com retenção de 90 dias.
Se a base estiver indisponível, cai para uma fila em memória (demonstração / testes).
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import threading
from collections import deque
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from fastapi.security import HTTPAuthorizationCredentials

from war_room.canal_eleitor import (
    carregar_assembleias_publicas,
    extrair_mensagens_whatsapp,
    hash_telefone,
    interpretar_mensagem,
    mascarar_telefone,
)

from ..security import bearer_scheme, current_user
from ..settings import Settings, get_settings

router = APIRouter(prefix="/api/whatsapp", tags=["canal-eleitor"])
logger = logging.getLogger("angola.api")
ROOT = Path(__file__).resolve().parents[3]
SEED = ROOT / "database" / "03_seed_municipios_angola.sql"
MAX_QUEIXAS = 5000
MAX_IDS_VISTOS = 20000
PAPEIS_PAINEL = ("ADMIN", "ANALISTA", "COORDENADOR", "LEITOR")
RETENCAO_DIAS = 90

_lock = threading.Lock()
_queixas: deque[dict[str, Any]] = deque(maxlen=MAX_QUEIXAS)
_vistos: dict[str, None] = {}


def _marcar_visto(identificador: str) -> None:
    if not identificador:
        return
    _vistos[identificador] = None
    if len(_vistos) > MAX_IDS_VISTOS:
        _vistos.pop(next(iter(_vistos)), None)


def _pool(request: Request | None):
    if request is None:
        return None
    return getattr(request.app.state, "db_pool", None)


def _payload_queixa(leitura: dict[str, Any], telefone: str, segredo: str) -> dict[str, Any]:
    return {
        **leitura["queixa"],
        "telefone_mascarado": mascarar_telefone(telefone),
        "telefone_hash": hash_telefone(telefone, segredo),
        "criado_em": datetime.now(UTC).isoformat(),
    }


def _registar_queixa(
    leitura: dict[str, Any],
    telefone: str,
    segredo: str,
    request: Request | None = None,
    campanha_id: str | None = None,
) -> None:
    registo = _payload_queixa(leitura, telefone, segredo)
    pool = _pool(request)
    if pool is not None:
        try:
            with pool.connection() as connection:
                with connection.transaction():
                    if campanha_id:
                        connection.execute(
                            "SELECT set_config('app.current_campanha_id', %s, true)",
                            (str(campanha_id),),
                        )
                    connection.execute(
                        "DELETE FROM queixas_eleitor WHERE criado_em < clock_timestamp() - make_interval(days => %s)",
                        (RETENCAO_DIAS,),
                    )
                    connection.execute(
                        """
                        INSERT INTO queixas_eleitor (
                            campanha_id, municipio, categoria, descricao,
                            telefone_mascarado, telefone_hash, proveniencia, origem
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'WHATSAPP')
                        """,
                        (
                            UUID(campanha_id) if campanha_id else None,
                            registo.get("municipio") or "NÃO IDENTIFICADO",
                            registo.get("categoria") or "OUTRA",
                            (registo.get("descricao") or "")[:600],
                            registo["telefone_mascarado"],
                            registo["telefone_hash"],
                            registo.get("proveniencia") or "SIMULADO",
                        ),
                    )
            return
        except Exception:
            logger.exception("Falha a gravar queixa no PostgreSQL; a usar fila em memória.")
    with _lock:
        _queixas.append(registo)


def _ler_queixas(request: Request | None, campanha_id: str | None) -> list[dict[str, Any]]:
    pool = _pool(request)
    if pool is not None:
        try:
            with pool.connection() as connection:
                if campanha_id:
                    connection.execute(
                        "SELECT set_config('app.current_campanha_id', %s, true)",
                        (str(campanha_id),),
                    )
                connection.execute(
                    "DELETE FROM queixas_eleitor WHERE criado_em < clock_timestamp() - make_interval(days => %s)",
                    (RETENCAO_DIAS,),
                )
                rows = connection.execute(
                    """
                    SELECT municipio, categoria, descricao, telefone_mascarado,
                           proveniencia, criado_em
                    FROM queixas_eleitor
                    ORDER BY criado_em ASC
                    LIMIT %s
                    """,
                    (MAX_QUEIXAS,),
                ).fetchall()
            return [
                {
                    "municipio": row["municipio"],
                    "categoria": row["categoria"],
                    "descricao": row["descricao"],
                    "telefone_mascarado": row["telefone_mascarado"],
                    "proveniencia": row["proveniencia"],
                    "criado_em": row["criado_em"].isoformat() if hasattr(row["criado_em"], "isoformat") else str(row["criado_em"]),
                }
                for row in rows
            ]
        except Exception:
            logger.exception("Falha a ler queixas no PostgreSQL; a usar fila em memória.")
    with _lock:
        return list(_queixas)


def acesso_painel(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict | None:
    """Em produção a leitura das queixas exige sessão de analista; em desenvolvimento fica aberta."""
    if settings.app_env != "production":
        return None
    user = current_user(credentials, settings)
    if user["perfil"] not in PAPEIS_PAINEL:
        raise HTTPException(status_code=403, detail="Perfil sem acesso às queixas.")
    return user


def _verificar_assinatura_meta(settings: Settings, cabecalho: str, corpo: bytes) -> None:
    segredo = settings.whatsapp_app_secret
    if not segredo:
        if settings.app_env == "production":
            raise HTTPException(status_code=503, detail="Canal sem segredo da aplicação Meta configurado.")
        return
    esperado = "sha256=" + hmac.new(segredo.encode("utf-8"), corpo, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(cabecalho or "", esperado):
        raise HTTPException(status_code=403, detail="Assinatura do webhook inválida.")


@router.get("/webhook")
def verificar_webhook(
    settings: Annotated[Settings, Depends(get_settings)],
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
):
    esperado = settings.whatsapp_verify_token or (None if settings.app_env == "production" else "dev-eleitor-2027")
    if hub_mode != "subscribe" or not esperado or not hmac.compare_digest(hub_verify_token, esperado):
        raise HTTPException(status_code=403, detail="Verificação do webhook recusada.")
    return PlainTextResponse(hub_challenge)


@router.post("/webhook")
async def receber_webhook(request: Request, settings: Annotated[Settings, Depends(get_settings)]):
    corpo = await request.body()
    _verificar_assinatura_meta(settings, request.headers.get("x-hub-signature-256", ""), corpo)
    try:
        payload = json.loads(corpo or b"{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Corpo JSON inválido.") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Corpo JSON inválido.")

    locais = carregar_assembleias_publicas(SEED)
    respostas = []
    for mensagem in extrair_mensagens_whatsapp(payload):
        with _lock:
            repetida = bool(mensagem["id"]) and mensagem["id"] in _vistos
            _marcar_visto(mensagem["id"])
        if repetida:
            continue
        leitura = interpretar_mensagem(mensagem["texto"], locais)
        if leitura["intencao"] == "QUEIXA":
            _registar_queixa(leitura, mensagem["de"], settings.jwt_secret_key, request)
        respostas.append(
            {
                "para": mascarar_telefone(mensagem["de"]),
                "intencao": leitura["intencao"],
                "texto": leitura["resposta"],
            }
        )
    return {
        "sucesso": True,
        "processadas": len(respostas),
        "respostas": respostas,
        "envio_meta": "configurado" if settings.whatsapp_access_token else "pendente_token",
    }


@router.get("/queixas")
def listar_queixas(
    request: Request,
    utilizador: Annotated[dict | None, Depends(acesso_painel)],
):
    campanha = utilizador["campaign_id"] if utilizador else None
    copia = _ler_queixas(request, campanha)
    agregadas: dict[tuple[str, str], int] = {}
    for item in copia:
        chave = (item["municipio"], item["categoria"])
        agregadas[chave] = agregadas.get(chave, 0) + 1
    return {
        "sucesso": True,
        "total": len(copia),
        "persistencia": "postgres" if _pool(request) else "memoria",
        "retencao_dias": RETENCAO_DIAS,
        "agregado": [
            {"municipio": mun, "categoria": cat, "total": total}
            for (mun, cat), total in sorted(agregadas.items(), key=lambda par: -par[1])
        ],
        "recentes": [
            {
                "municipio": item["municipio"],
                "categoria": item["categoria"],
                "descricao": item["descricao"],
                "telefone_mascarado": item["telefone_mascarado"],
                "criado_em": item["criado_em"],
                "proveniencia": item["proveniencia"],
            }
            for item in copia[-20:]
        ],
    }


@router.post("/simular")
def simular_mensagem(
    payload: dict[str, Any],
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
):
    """Simulador do painel e dos testes; usa o mesmo interpretador do webhook. Desligado em produção."""
    if settings.app_env == "production":
        raise HTTPException(status_code=404, detail="Not Found")
    texto = str(payload.get("texto") or "")[:600]
    telefone = str(payload.get("de") or "244900000000")
    leitura = interpretar_mensagem(texto, carregar_assembleias_publicas(SEED))
    if leitura["intencao"] == "QUEIXA":
        _registar_queixa(leitura, telefone, settings.jwt_secret_key, request)
    return {"sucesso": True, "intencao": leitura["intencao"], "texto": leitura["resposta"]}
