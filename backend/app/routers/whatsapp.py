"""Webhook do canal WhatsApp do eleitor e fila de queixas para a sala de comando."""

from __future__ import annotations

import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse

from war_room.canal_eleitor import (
    carregar_assembleias_publicas,
    extrair_mensagens_whatsapp,
    hash_telefone,
    interpretar_mensagem,
    mascarar_telefone,
)

router = APIRouter(prefix="/api/whatsapp", tags=["canal-eleitor"])
ROOT = Path(__file__).resolve().parents[3]
SEED = ROOT / "database" / "03_seed_municipios_angola.sql"
_lock = threading.Lock()
_queixas: list[dict[str, Any]] = []
_vistos: set[str] = set()


def _token_verify(request: Request) -> str | None:
    settings = request.app.state.settings
    configurado = getattr(settings, "whatsapp_verify_token", None)
    if configurado:
        return configurado
    if settings.app_env == "production":
        return None
    return "dev-eleitor-2027"


@router.get("/webhook")
def verificar_webhook(
    request: Request,
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
):
    esperado = _token_verify(request)
    if hub_mode != "subscribe" or not esperado or hub_verify_token != esperado:
        raise HTTPException(status_code=403, detail="Verificação do webhook recusada.")
    return PlainTextResponse(hub_challenge)


@router.post("/webhook")
def receber_webhook(payload: dict[str, Any], request: Request):
    locais = carregar_assembleias_publicas(SEED)
    respostas = []
    for mensagem in extrair_mensagens_whatsapp(payload):
        if mensagem["id"] and mensagem["id"] in _vistos:
            continue
        leitura = interpretar_mensagem(mensagem["texto"], locais)
        registo = None
        if leitura["intencao"] == "QUEIXA":
            registo = {
                **leitura["queixa"],
                "telefone_mascarado": mascarar_telefone(mensagem["de"]),
                "telefone_hash": hash_telefone(mensagem["de"]),
                "criado_em": datetime.now(UTC).isoformat(),
            }
            with _lock:
                _queixas.append(registo)
                if mensagem["id"]:
                    _vistos.add(mensagem["id"])
        elif mensagem["id"]:
            with _lock:
                _vistos.add(mensagem["id"])
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
        "envio_meta": "pendente_token" if not getattr(request.app.state.settings, "whatsapp_access_token", None) else "configurado",
    }


@router.get("/queixas")
def listar_queixas():
    with _lock:
        copia = list(_queixas)
    agregadas: dict[tuple[str, str], int] = {}
    for item in copia:
        chave = (item["municipio"], item["categoria"])
        agregadas[chave] = agregadas.get(chave, 0) + 1
    return {
        "sucesso": True,
        "total": len(copia),
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
def simular_mensagem(payload: dict[str, Any]):
    """Entrada directa para a sala de comando e para testes, no mesmo interpretador do webhook."""
    texto = str(payload.get("texto") or "")
    telefone = str(payload.get("de") or "244900000000")
    locais = carregar_assembleias_publicas(SEED)
    leitura = interpretar_mensagem(texto, locais)
    if leitura["intencao"] == "QUEIXA":
        registo = {
            **leitura["queixa"],
            "telefone_mascarado": mascarar_telefone(telefone),
            "telefone_hash": hash_telefone(telefone),
            "criado_em": datetime.now(UTC).isoformat(),
        }
        with _lock:
            _queixas.append(registo)
    return {"sucesso": True, "intencao": leitura["intencao"], "texto": leitura["resposta"]}
