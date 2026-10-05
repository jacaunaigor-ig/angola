"""Router de planos comerciais, SKUs e pedidos de proposta (FastAPI)."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Body, HTTPException, Query

from war_room.planos_comerciais import (
    MUNICIPIOS_VENDAVEIS,
    PLANOS,
    calcular_orcamento,
    nomes_no_ambito,
    obter_plano,
)

router = APIRouter(prefix="/api", tags=["planos-comerciais"])

# Registro volátil / auditoria de pedidos de proposta na sessão da API
_pedidos_proposta: list[dict[str, Any]] = []


def resolver_plano_request(
    x_plano_campanha: str | None = None,
    plano: str | None = None,
) -> str:
    codigo = (x_plano_campanha or plano or "NACIONAL").upper().strip()
    return codigo if codigo in PLANOS else "NACIONAL"


def exigir_funcionalidade(plano_codigo: str, chave: str) -> None:
    plano = obter_plano(plano_codigo)
    if not plano:
        raise HTTPException(
            status_code=400,
            detail="Plano comercial inválido. Use MUNICIPAL, PROVINCIAL ou NACIONAL no cabeçalho X-Plano-Campanha.",
        )
    if not plano.get("funcionalidades", {}).get(chave, False):
        upgrade_msg = (
            "Disponível a partir do Plano Provincial."
            if chave in {"dia_d", "casos_juridicos", "invalidar_lote", "malha_dupla_dpa"}
            else "Disponível no Plano Nacional / HQ."
        )
        raise HTTPException(
            status_code=402,
            detail={
                "sucesso": False,
                "erro": "Funcionalidade fora do plano contratado.",
                "funcionalidade": chave,
                "plano": plano_codigo,
                "upgrade": upgrade_msg,
            },
        )


@router.get("/planos")
def catalogo_planos():
    return {
        "sucesso": True,
        "moeda": "AOA",
        "ciclo": "CICLO_ELEITORAL_2027",
        "mensagem": "Três SKUs vendáveis. O preço de tabela não substitui a proposta formal.",
        "planos": list(PLANOS.values()),
        "municipios_vendaveis": MUNICIPIOS_VENDAVEIS,
    }


@router.get("/planos/{codigo}")
def obter_detalhes_plano(codigo: str):
    plano = obter_plano(codigo)
    if not plano:
        raise HTTPException(status_code=404, detail="Plano inexistente.")
    return {"sucesso": True, "plano": plano}


@router.post("/planos/orcamento")
def orcamento_plano(body: dict[str, Any] = Body(...)):
    plano_codigo = body.get("plano", "MUNICIPAL")
    territorio = body.get("territorio")
    brigadistas = body.get("brigadistas")
    resultado = calcular_orcamento(plano_codigo, territorio, brigadistas)
    if not resultado.get("ok"):
        raise HTTPException(status_code=400, detail=resultado.get("erro"))
    return {"sucesso": True, "orcamento": resultado}


@router.get("/campanha/entitlements")
def campaign_entitlements(
    plano: str = Query(default="NACIONAL"),
    territorio: str | None = Query(default=None),
):
    ambito = nomes_no_ambito(plano, territorio)
    if not ambito.get("ok"):
        raise HTTPException(status_code=400, detail=ambito.get("erro"))
    plano_data = ambito["plano"]
    return {
        "sucesso": True,
        "plano": plano_data["codigo"],
        "nome": plano_data["nome"],
        "funcionalidades": plano_data["funcionalidades"],
        "limites": plano_data["limites"],
        "ambito": {
            "irrestrito": bool(ambito.get("irrestrito")),
            "nomes": ambito.get("nomes", []),
            "municipio_contratado": ambito.get("municipio_contratado"),
            "provincia_contratada": ambito.get("provincia_contratada"),
        },
    }


@router.post("/propostas", status_code=201)
def submit_proposal_request(body: dict[str, Any] = Body(...)):
    organizacao = str(body.get("organizacao", "")).strip()
    contacto = str(body.get("contacto", "")).strip()
    plano_codigo = str(body.get("plano", "")).strip().upper()
    territorio = body.get("territorio")
    brigadistas = body.get("brigadistas_contratados")
    telefone = body.get("telefone")
    email = body.get("email")
    notas = body.get("notas")

    if not organizacao or not contacto or not plano_codigo:
        raise HTTPException(status_code=400, detail="organizacao, contacto e plano são obrigatórios.")

    plano = obter_plano(plano_codigo)
    if not plano:
        raise HTTPException(status_code=400, detail=f"Plano '{plano_codigo}' inválido.")

    orc = calcular_orcamento(plano_codigo, territorio, brigadistas)
    if not orc.get("ok"):
        raise HTTPException(status_code=400, detail=orc.get("erro"))

    protocolo = f"PROP-2027-{str(uuid4())[:8].upper()}"
    registro = {
        "protocolo": protocolo,
        "organizacao": organizacao,
        "contacto": contacto,
        "telefone": telefone,
        "email": email,
        "plano": plano_codigo,
        "territorio": orc.get("territorio"),
        "total_aoa": orc.get("total_aoa"),
        "total_formatado": orc.get("total_formatado"),
        "brigadistas": orc.get("brigadistas"),
        "notas": notas,
        "criado_em": datetime.now(UTC).isoformat(),
        "status": "RECEBIDA_WAR_ROOM",
    }
    _pedidos_proposta.append(registro)

    return {
        "sucesso": True,
        "mensagem": "Proposta protocolada no ciclo 2027.",
        "pedido": registro,
    }
