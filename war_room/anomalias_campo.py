"""
Análise de integridade operacional de campo para o War Room.

Detecta:
- Rajadas impossíveis (mais de X formulários numa janela curta);
- Coordenadas fora dos polígonos municipais/provinciais mapeados (Shapely).
"""

from __future__ import annotations

import json
import os
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

from shapely.geometry import Point, shape
from shapely.prepared import prep

LIMIAR_FORMULARIOS_PADRAO = 50
JANELA_MINUTOS_PADRAO = 5


def _parse_dt(valor: Any) -> Optional[datetime]:
    if valor is None:
        return None
    if isinstance(valor, datetime):
        return valor if valor.tzinfo else valor.replace(tzinfo=timezone.utc)
    texto = str(valor).strip()
    if not texto:
        return None
    try:
        return datetime.fromisoformat(texto.replace("Z", "+00:00"))
    except ValueError:
        return None


def _coord(visita: Dict[str, Any]) -> Optional[Tuple[float, float]]:
    try:
        lon = float(visita.get("longitude") if visita.get("longitude") is not None else visita.get("localizacao", {}).get("longitude"))
        lat = float(visita.get("latitude") if visita.get("latitude") is not None else visita.get("localizacao", {}).get("latitude"))
    except (TypeError, ValueError, AttributeError):
        return None
    if lon < -180 or lon > 180 or lat < -90 or lat > 90:
        return None
    return lon, lat


def carregar_malha_shapely(geojson_obj: Optional[Dict[str, Any]] = None, caminho: Optional[str] = None) -> List[Dict[str, Any]]:
    """Converte FeatureCollection em polígonos Shapely preparados."""
    dados = geojson_obj
    if dados is None and caminho and os.path.exists(caminho):
        with open(caminho, "r", encoding="utf-8") as fh:
            dados = json.load(fh)
    if not dados:
        return []

    poligonos: List[Dict[str, Any]] = []
    for feat in dados.get("features") or []:
        geom = feat.get("geometry") or {}
        if geom.get("type") not in ("Polygon", "MultiPolygon"):
            continue
        try:
            geom_shape = shape(geom)
            if geom_shape.is_empty:
                continue
            props = feat.get("properties") or {}
            nome = (
                props.get("nome")
                or props.get("municipio")
                or props.get("codigo_dpa")
                or props.get("codigo_oficial")
                or "territorio"
            )
            poligonos.append({
                "nome": str(nome),
                "nome_norm": str(nome).strip().upper(),
                "tipo": props.get("tipo") or props.get("nivel_territorial") or "MUNICIPIO",
                "geometry": geom_shape,
                "prepared": prep(geom_shape),
            })
        except Exception:
            continue
    return poligonos


def detectar_rajada_formularios(
    visitas: Iterable[Dict[str, Any]],
    limiar: int = LIMIAR_FORMULARIOS_PADRAO,
    janela_minutos: int = JANELA_MINUTOS_PADRAO,
) -> List[Dict[str, Any]]:
    """Identifica ativistas com mais de `limiar` formulários em `janela_minutos`."""
    por_ativista: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for visita in visitas:
        momento = _parse_dt(visita.get("registado_em"))
        if momento is None:
            continue
        chave = str(visita.get("ativista_id") or visita.get("ativista_nome") or "desconhecido")
        por_ativista[chave].append({**visita, "_dt": momento})

    alertas: List[Dict[str, Any]] = []
    janela = timedelta(minutes=janela_minutos)

    for ativista_id, registos in por_ativista.items():
        ordenados = sorted(registos, key=lambda v: v["_dt"])
        inicio = 0
        for fim, actual in enumerate(ordenados):
            while ordenados[inicio]["_dt"] < actual["_dt"] - janela:
                inicio += 1
            quantidade = fim - inicio + 1
            if quantidade > limiar:
                lote = ordenados[inicio : fim + 1]
                uuids = [str(v.get("uuid") or v.get("id")) for v in lote]
                alertas.append({
                    "tipo": "RAJADA_IMPOSSIVEL",
                    "severidade": "CRITICA",
                    "ativista_id": ativista_id,
                    "ativista_nome": lote[0].get("ativista_nome") or ativista_id,
                    "quantidade": quantidade,
                    "janela_minutos": janela_minutos,
                    "limiar": limiar,
                    "inicio": lote[0]["_dt"].isoformat(),
                    "fim": lote[-1]["_dt"].isoformat(),
                    "uuids": uuids,
                    "descricao": (
                        f"{quantidade} formulários em {janela_minutos} minutos "
                        f"(limiar: {limiar}). Ritmo humanamente inviável."
                    ),
                })
                break
    return alertas


def detectar_coordenadas_fora_municipio(
    visitas: Iterable[Dict[str, Any]],
    poligonos: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Marca visitas cujo ponto cai fora do município/província mapeado."""
    if not poligonos:
        return []

    por_nome = {p["nome_norm"]: p for p in poligonos}
    alertas: List[Dict[str, Any]] = []

    for visita in visitas:
        par = _coord(visita)
        if par is None:
            continue
        lon, lat = par
        ponto = Point(lon, lat)

        alvo_nome = str(
            visita.get("municipio")
            or (visita.get("metadados_aparelho") or {}).get("municipio")
            or ""
        ).strip().upper()

        poligono_alvo = por_nome.get(alvo_nome) if alvo_nome else None
        dentro_alvo = bool(poligono_alvo and poligono_alvo["prepared"].contains(ponto))
        dentro_qualquer = any(p["prepared"].contains(ponto) for p in poligonos)

        if poligono_alvo and not dentro_alvo:
            alertas.append({
                "tipo": "FORA_MUNICIPIO",
                "severidade": "ALTA",
                "ativista_id": visita.get("ativista_id"),
                "ativista_nome": visita.get("ativista_nome") or visita.get("ativista_id"),
                "uuid": str(visita.get("uuid") or visita.get("id")),
                "longitude": lon,
                "latitude": lat,
                "municipio_declarado": alvo_nome.title(),
                "territorio_mais_proximo": None,
                "uuids": [str(visita.get("uuid") or visita.get("id"))],
                "quantidade": 1,
                "descricao": (
                    f"Coordenada ({lat:.4f}, {lon:.4f}) fora do polígono de {alvo_nome.title()}."
                ),
            })
        elif not dentro_qualquer:
            alertas.append({
                "tipo": "FORA_MALHA_MAPEADA",
                "severidade": "ALTA",
                "ativista_id": visita.get("ativista_id"),
                "ativista_nome": visita.get("ativista_nome") or visita.get("ativista_id"),
                "uuid": str(visita.get("uuid") or visita.get("id")),
                "longitude": lon,
                "latitude": lat,
                "municipio_declarado": alvo_nome.title() or "—",
                "uuids": [str(visita.get("uuid") or visita.get("id"))],
                "quantidade": 1,
                "descricao": (
                    f"Coordenada ({lat:.4f}, {lon:.4f}) fora de qualquer limite municipal/provincial mapeado."
                ),
            })

    return alertas


def analisar_integridade_campo(
    visitas: Iterable[Dict[str, Any]],
    geojson_malha: Optional[Dict[str, Any]] = None,
    caminho_malha: Optional[str] = None,
    limiar: int = LIMIAR_FORMULARIOS_PADRAO,
    janela_minutos: int = JANELA_MINUTOS_PADRAO,
) -> Dict[str, Any]:
    visitas_lista = list(visitas)
    poligonos = carregar_malha_shapely(geojson_malha, caminho_malha)
    rajadas = detectar_rajada_formularios(visitas_lista, limiar=limiar, janela_minutos=janela_minutos)
    geo = detectar_coordenadas_fora_municipio(visitas_lista, poligonos)

    alertas = [*rajadas, *geo]
    return {
        "total_visitas_analisadas": len(visitas_lista),
        "total_alertas": len(alertas),
        "total_rajadas": len(rajadas),
        "total_fora_municipio": len(geo),
        "alertas": alertas,
    }


def visitas_demonstracao_risco() -> List[Dict[str, Any]]:
    """Lote SIMULADO apenas para exercitar a tabela de risco quando a API não tem amostra."""
    base = datetime(2026, 9, 30, 10, 0, tzinfo=timezone.utc)
    ativista = "b0000000-0000-0000-0000-000000000001"
    visitas = []
    for i in range(52):
        visitas.append({
            "uuid": f"d0000000-0000-4000-8000-{i:012d}",
            "id": f"d0000000-0000-4000-8000-{i:012d}",
            "ativista_id": ativista,
            "ativista_nome": "Brigada 04 — Manuel Gaspar",
            "longitude": 13.266 + (i * 0.00001),
            "latitude": -8.916,
            "municipio": "Luanda",
            "registado_em": (base + timedelta(seconds=i * 5)).isoformat(),
            "sentimento": "POSITIVO",
        })
    visitas.append({
        "uuid": "e0000000-0000-4000-8000-000000000099",
        "id": "e0000000-0000-4000-8000-000000000099",
        "ativista_id": "b0000000-0000-0000-0000-000000000002",
        "ativista_nome": "Brigada 07 — Esperança",
        "longitude": 0.0,
        "latitude": 0.0,
        "municipio": "Luanda",
        "registado_em": (base + timedelta(minutes=20)).isoformat(),
        "sentimento": "NEUTRO",
    })
    return visitas
