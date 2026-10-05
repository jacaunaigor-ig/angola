"""Canal do eleitor (WhatsApp): assembleia pública e queixa local.

Não consulta o caderno eleitoral pessoal. A lista de assembleias vem do seed
estimado do repositório e deve ser apresentada como SIMULADO.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
from pathlib import Path
from typing import Any

DORES = (
    "AGUA",
    "ENERGIA",
    "EMPREGO",
    "SANEAMENTO",
    "SAUDE",
    "EDUCACAO",
    "ESTRADAS",
    "HABITACAO",
    "SEGURANCA",
)

_SEED_RE = re.compile(
    r"'(CNE-[A-Z0-9-]+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'",
    re.IGNORECASE,
)
_BI_RE = re.compile(r"\b(\d{9,}[A-Z]{0,2}|\d{8,})\b", re.IGNORECASE)


def _norm(texto: str) -> str:
    base = unicodedata.normalize("NFKD", texto or "")
    sem = "".join(c for c in base if not unicodedata.combining(c))
    return sem.casefold().strip()


def mascarar_telefone(valor: str) -> str:
    digitos = re.sub(r"\D", "", valor or "")
    if len(digitos) < 4:
        return "****"
    return f"***{digitos[-3:]}"


def hash_telefone(valor: str) -> str:
    digitos = re.sub(r"\D", "", valor or "")
    return hashlib.sha256(digitos.encode("utf-8")).hexdigest()


def carregar_assembleias_publicas(seed_sql: Path) -> list[dict[str, str]]:
    if not seed_sql.is_file():
        return []
    texto = seed_sql.read_text(encoding="utf-8")
    locais = []
    for codigo, nome, provincia, municipio in _SEED_RE.findall(texto):
        locais.append(
            {
                "codigo_cne": codigo,
                "nome": nome,
                "provincia": provincia,
                "municipio": municipio,
                "proveniencia": "SIMULADO",
            }
        )
    return locais


def procurar_assembleias(locais: list[dict[str, str]], termo: str, limite: int = 3) -> list[dict[str, str]]:
    alvo = _norm(termo)
    if not alvo:
        return []
    encontrados = [
        local
        for local in locais
        if alvo in _norm(local["municipio"]) or alvo in _norm(local["provincia"]) or alvo in _norm(local["nome"])
    ]
    return encontrados[:limite]


def _pedido_caderno_pessoal(texto: str) -> bool:
    normal = _norm(texto)
    if any(marca in normal for marca in ("meu bi", "numero de bi", "nº de bi", "caderno", "eleitor n", "bilhete")):
        return True
    return bool(_BI_RE.search(texto or ""))


def interpretar_mensagem(texto: str, locais: list[dict[str, str]]) -> dict[str, Any]:
    bruto = (texto or "").strip()
    if _pedido_caderno_pessoal(bruto):
        return {
            "intencao": "RECUSA_CADERNO",
            "resposta": (
                "Este canal não consulta o caderno eleitoral nem o bilhete de identidade. "
                "A mesa oficial confirma-se no recenseamento da CNE. "
                "Posso indicar assembleias públicas de exemplo (dados simulados) com: MESA Talatona. "
                "Para uma queixa do bairro: QUEIXA agua Viana falta de água na torneira."
            ),
        }

    partes = bruto.split(maxsplit=1)
    comando = _norm(partes[0]) if partes else ""
    resto = partes[1].strip() if len(partes) > 1 else ""

    if comando in {"ajuda", "help", "oi", "ola", "olá", "menu", ""}:
        return {
            "intencao": "AJUDA",
            "resposta": (
                "Canal do eleitor — Angola 2027.\n"
                "MESA <município> — assembleias públicas de exemplo. Não é o caderno da CNE.\n"
                "QUEIXA <tema> <município> <texto> — temas: agua, energia, emprego, saneamento, saude, educacao, estradas."
            ),
        }

    if comando == "mesa":
        achados = procurar_assembleias(locais, resto)
        if not achados:
            return {
                "intencao": "MESA",
                "resposta": (
                    "Não há assembleia de exemplo para esse nome. "
                    "Tente MESA Talatona, Viana, Lobito ou Lubango. "
                    "Isto não substitui o caderno eleitoral da CNE."
                ),
            }
        linhas = [
            f"- {item['nome']} ({item['municipio']}, {item['provincia']}) · {item['codigo_cne']} · SIMULADO"
            for item in achados
        ]
        return {
            "intencao": "MESA",
            "assembleias": achados,
            "resposta": "Assembleias de exemplo, não oficiais:\n" + "\n".join(linhas),
        }

    if comando == "queixa":
        tokens = resto.split()
        if len(tokens) < 3:
            return {
                "intencao": "QUEIXA_INVALIDA",
                "resposta": "Use: QUEIXA agua Viana descrição curta do problema.",
            }
        tema = _norm(tokens[0]).upper()
        mapa = {
            "AGUA": "AGUA",
            "ENERGIA": "ENERGIA",
            "LUZ": "ENERGIA",
            "EMPREGO": "EMPREGO",
            "SANEAMENTO": "SANEAMENTO",
            "SAUDE": "SAUDE",
            "EDUCACAO": "EDUCACAO",
            "ESTRADAS": "ESTRADAS",
            "ESTRADA": "ESTRADAS",
            "HABITACAO": "HABITACAO",
            "SEGURANCA": "SEGURANCA",
        }
        categoria = mapa.get(tema)
        if not categoria:
            return {
                "intencao": "QUEIXA_INVALIDA",
                "resposta": "Tema não reconhecido. Use agua, energia, emprego, saneamento, saude, educacao ou estradas.",
            }
        municipio = tokens[1]
        descricao = " ".join(tokens[2:])[:500]
        return {
            "intencao": "QUEIXA",
            "queixa": {
                "categoria": categoria,
                "municipio": municipio,
                "descricao": descricao,
                "proveniencia": "RELATO_ELEITOR",
            },
            "resposta": (
                f"Queixa de {categoria.lower()} em {municipio} registada para a sala de comando. "
                "Não prometemos obra nem prazo. A mesa de voto continua a ser confirmada na CNE."
            ),
        }

    return {
        "intencao": "AJUDA",
        "resposta": "Não percebi. Envie AJUDA.",
    }


def extrair_mensagens_whatsapp(payload: dict[str, Any]) -> list[dict[str, str]]:
    """Lê o formato Cloud API da Meta e devolve texto + remetente."""
    mensagens = []
    for entry in payload.get("entry") or []:
        for change in entry.get("changes") or []:
            value = change.get("value") or {}
            for item in value.get("messages") or []:
                texto = ((item.get("text") or {}).get("body") or "").strip()
                remetente = str(item.get("from") or "")
                if texto and remetente:
                    mensagens.append({"de": remetente, "texto": texto, "id": str(item.get("id") or "")})
    return mensagens
