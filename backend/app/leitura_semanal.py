"""Leitura pública semanal: manchetes abertas e canais conhecidos. Não é sondagem."""

from __future__ import annotations

import html
import json
import re
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
from datetime import UTC, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "data" / "cache" / "leitura_semanal.json"
DIAS = 7
LIMITE = 18
FEED = (
    "https://news.google.com/rss/search?q=Angola+"
    "(MPLA+OR+UNITA+OR+elei%C3%A7%C3%B5es+OR+Louren%C3%A7o+OR+congresso)"
    "&hl=pt-PT&gl=AO&ceid=PT:pt"
)

CANAIS = [
    {"nome": "Jornal de Angola", "lado": "Estado", "meio": "Diário", "url": "https://www.jornaldeangola.ao"},
    {"nome": "ANGOP", "lado": "Estado", "meio": "Agência", "url": "https://www.angop.ao"},
    {"nome": "TPA", "lado": "Estado", "meio": "Televisão", "url": "https://www.tpa.ao"},
    {"nome": "RNA", "lado": "Estado", "meio": "Rádio", "url": "https://www.rna.ao"},
    {"nome": "Novo Jornal", "lado": "Privado", "meio": "Jornal", "url": "https://www.novojornal.co.ao"},
    {"nome": "O País", "lado": "Privado", "meio": "Jornal", "url": "https://www.opais.ao"},
    {"nome": "Expansão", "lado": "Economia", "meio": "Semanário", "url": "https://expansao.co.ao"},
    {"nome": "Club-K", "lado": "Independente", "meio": "Portal", "url": "https://www.club-k.net"},
    {"nome": "Angola 24 Horas", "lado": "Independente", "meio": "Portal", "url": "https://angola24horas.com"},
    {"nome": "Folha 8", "lado": "Independente", "meio": "Jornal", "url": "https://jornalf8.net"},
    {"nome": "DW", "lado": "Internacional", "meio": "Rádio e site", "url": "https://www.dw.com/pt-002/angola"},
    {"nome": "RFI", "lado": "Internacional", "meio": "Rádio", "url": "https://www.rfi.fr/pt/"},
    {"nome": "Facebook", "lado": "Rede", "meio": "5,5 milhões de identidades no fim de 2025", "url": "https://www.facebook.com"},
    {"nome": "TikTok", "lado": "Rede", "meio": "3,95 milhões de adultos; o que mais cresce", "url": "https://www.tiktok.com"},
    {"nome": "WhatsApp", "lado": "Rede", "meio": "Grupos e notas de voz; quase invisível nas contagens", "url": "https://www.whatsapp.com"},
    {"nome": "YouTube", "lado": "Rede", "meio": "Vídeo longo; o maior tráfego web citado em rankings de 2026", "url": "https://www.youtube.com"},
]

TEMAS = (
    ("EMPREGO", "Emprego jovem", ("emprego", "desemprego", "jovem", "juventude")),
    ("AGUA", "Água", ("agua",)),
    ("LUZ", "Luz", ("luz", "energia", "electricidade")),
    ("FUNDO", "Petróleo e fundo", ("petroleo", "fundo", "gas ", "mineral")),
    ("PACTO", "Pacto e congresso", ("pacto", "alternancia", "congresso", "candidato")),
    ("CASA", "Casa e bairro", ("habitacao", "demol", "bairro", "musseque")),
    ("SEGURANCA", "Segurança", ("seguranca", "policia", "atentado")),
)


def _sem_acento(texto: str) -> str:
    base = unicodedata.normalize("NFD", texto or "")
    return "".join(c for c in base if unicodedata.category(c) != "Mn").lower()


def extrair_itens(xml_bytes: bytes, limite: int = LIMITE) -> list[dict]:
    raiz = ET.fromstring(xml_bytes)
    itens = []
    for no in raiz.findall("./channel/item"):
        titulo = html.unescape((no.findtext("title") or "")).strip()
        if not titulo:
            continue
        fonte = ""
        origem = no.find("source")
        if origem is not None and origem.text:
            fonte = html.unescape(origem.text).strip()
        if not fonte and " - " in titulo:
            titulo, fonte = titulo.rsplit(" - ", 1)
            titulo, fonte = titulo.strip(), fonte.strip()
        if fonte and titulo.endswith(f" - {fonte}"):
            titulo = titulo[: -(len(fonte) + 3)].strip()
        plano = _sem_acento(f"{titulo} {fonte}")
        if any(ruido in plano for ruido in ("olimp", "futebol", "jogo da juventude")):
            continue
        itens.append({
            "titulo": titulo,
            "fonte": fonte or "Imprensa",
            "ligacao": (no.findtext("link") or "").strip(),
            "quando": (no.findtext("pubDate") or "").strip(),
            "temas": temas_do_texto(f"{titulo} {fonte}"),
        })
        if len(itens) >= limite:
            break
    return itens


def temas_do_texto(texto: str) -> list[str]:
    plano = _sem_acento(texto)
    return [codigo for codigo, _nome, chaves in TEMAS if any(chave in plano for chave in chaves)]


def contar_temas(itens: list[dict]) -> list[dict]:
    contagem = []
    for codigo, nome, _chaves in TEMAS:
        n = sum(1 for item in itens if codigo in (item.get("temas") or temas_do_texto(item.get("titulo", ""))))
        if n:
            contagem.append({"id": codigo, "nome": nome, "manchetes": n})
    contagem.sort(key=lambda t: t["manchetes"], reverse=True)
    return contagem


def leitura_valida(gerada_em: str, agora: datetime | None = None, dias: int = DIAS) -> bool:
    try:
        momento = datetime.fromisoformat(gerada_em)
    except ValueError:
        return False
    if momento.tzinfo is None:
        momento = momento.replace(tzinfo=UTC)
    agora = agora or datetime.now(UTC)
    return agora - momento < timedelta(days=dias)


def _ler_cache() -> dict | None:
    if not CACHE.exists():
        return None
    try:
        return json.loads(CACHE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _gravar_cache(payload: dict) -> None:
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _descarregar(url: str = FEED) -> bytes:
    pedido = urllib.request.Request(url, headers={"User-Agent": "GPS-Eleitoral-Angola/leitura-semanal"})
    with urllib.request.urlopen(pedido, timeout=20) as resposta:
        return resposta.read()


def _marcar_temas(payload: dict) -> dict:
    for item in payload.get("manchetes") or []:
        if not item.get("temas"):
            item["temas"] = temas_do_texto(f"{item.get('titulo', '')} {item.get('fonte', '')}")
    return payload


def montar_leitura(forcar: bool = False, descarregar=_descarregar) -> dict:
    cache = _ler_cache()
    if cache and not forcar and leitura_valida(cache.get("gerada_em", "")):
        cache["em_cache"] = True
        return _marcar_temas(cache)

    try:
        itens = extrair_itens(descarregar())
    except Exception as exc:
        if cache:
            cache["em_cache"] = True
            cache["aviso"] = "A rede falhou. Esta é a última leitura guardada."
            return _marcar_temas(cache)
        raise RuntimeError("Sem leitura guardada e sem rede.") from exc

    agora = datetime.now(UTC)
    payload = {
        "sucesso": True,
        "gerada_em": agora.isoformat(),
        "proxima_em": (agora + timedelta(days=DIAS)).isoformat(),
        "dias": DIAS,
        "em_cache": False,
        "proveniencia": "MANCHETES_PUBLICAS",
        "nota": (
            "Contagem de palavras nas manchetes públicas da semana. "
            "Não é sondagem e não lê contas privadas."
        ),
        "fonte_feed": "Google Notícias, pesquisa pública sobre Angola",
        "estudo_audiencia": (
            "Em maio de 2026, um estudo de escuta da LVBA apontou Lil Pasta News, "
            "Club-K e Angola 24 Horas entre os mais lidos. Não é um recenseamento."
        ),
        "redes": (
            "DataReportal, fim de 2025: 17,6 milhões de internautas (44,8%). "
            "Facebook 5,5 milhões. TikTok 3,95 milhões de adultos. "
            "Mais de metade do país continua offline."
        ),
        "canais": CANAIS,
        "temas": contar_temas(itens),
        "manchetes": itens,
    }
    _gravar_cache(payload)
    return _marcar_temas(payload)


def texto_limpo(valor: str) -> str:
    return re.sub(r"\s+", " ", valor or "").strip()
