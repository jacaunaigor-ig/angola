"""Contrato de grão territorial: votos OFICIAL só no círculo provincial CNE 2022.

Município, comuna e bairro nunca recebem apuramento de 2022. O de-para DPA
parte geometria e nomes; não redistribui votos. Províncias novas ou residual
da DPA 2024 ficam AUSENTE — sem inventar microdados.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

from war_room.custo_logistico import calcular_indice_prioridade_completo
from war_room.motor_hondt import simular_hondt_provincial

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"

NIVEIS_SEM_VOTO_CNE = frozenset({"municipio", "comuna", "bairro", "comuna_distrito"})
MARCA_FONTE_MUNICIPAL_CNE = "FONTE_CNE_MUNICIPAL=SIM"
NOTA_SEM_VOTO_MUNICIPAL = (
    "A CNE não publicou votos municipais de 2022. Esta malha é operacional: "
    "a cor distingue vizinhos e não é apuramento. O de-para DPA parte geometria, não votos."
)
NOTA_SEM_VOTO_LOCAL = (
    "Comunas e bairros sem acta da CNE. Traçado de referência geográfica (OSM / sede). "
    "O círculo provincial de 2022, quando indicado, é da província inteira."
)


def _zone(votes_party: int, votes_opposition: int, valid: int, bastion: float = 15, opposition: float = -15):
    party_pct = round(votes_party / valid * 100, 2) if valid else 0.0
    opposition_pct = round(votes_opposition / valid * 100, 2) if valid else 0.0
    margin = round(party_pct - opposition_pct, 2)
    zone = (
        "BASTIAO"
        if margin >= bastion and valid
        else "OPOSICAO"
        if margin <= opposition and valid
        else "CAMPO_BATALHA"
    )
    return {
        "zonamento": zone,
        "margem_perc": margin,
        "votos_partido_perc": party_pct,
        "votos_oposicao_perc": opposition_pct,
        "formula_aplicada": f"Margem = {party_pct}% - {opposition_pct}% = {margin} p.p.",
        "parametros_utilizados": {"limiar_bastiao_margem": bastion, "limiar_oposicao_margem": opposition},
    }


_ACENTOS = str.maketrans("áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ", "aaaaeeiooouucAAAAEEIOOOUUC")


def _norm(nome: str | None) -> str:
    texto = (nome or "").strip().lower().translate(_ACENTOS)
    return re.sub(r"\s+", " ", texto)


@lru_cache(maxsize=1)
def _readme_raw() -> str:
    return (RAW / "README.md").read_text(encoding="utf-8")


def fonte_municipal_cne_documentada(readme: str | None = None) -> bool:
    """Só uma linha isolada `FONTE_CNE_MUNICIPAL=SIM` autoriza voto OFICIAL abaixo da província."""
    texto = readme if readme is not None else _readme_raw()
    return any(linha.strip() == MARCA_FONTE_MUNICIPAL_CNE for linha in texto.splitlines())


@lru_cache(maxsize=1)
def _de_para() -> dict:
    caminho = RAW / "de_para_dpa_2016_2024.json"
    if not caminho.is_file():
        return {}
    with caminho.open(encoding="utf-8") as fonte:
        return json.load(fonte)


@lru_cache(maxsize=1)
def _cne_2022() -> dict:
    caminho = RAW / "resultados_eleitorais_cne_2022.json"
    if not caminho.is_file():
        return {"provincias": []}
    with caminho.open(encoding="utf-8") as fonte:
        return json.load(fonte)


@lru_cache(maxsize=1)
def _municipios_operacao() -> dict:
    caminho = RAW / "municipios_operacao.json"
    if not caminho.is_file():
        return {"municipios": []}
    with caminho.open(encoding="utf-8") as fonte:
        return json.load(fonte)


@lru_cache(maxsize=1)
def _malha_local() -> dict:
    caminho = RAW / "malha_local.json"
    if not caminho.is_file():
        return {"municipios": {}}
    with caminho.open(encoding="utf-8") as fonte:
        return json.load(fonte)


def tipo_correspondencia_2024(nome: str, de_para: dict | None = None) -> str | None:
    tabela = de_para if de_para is not None else _de_para()
    alvo = _norm(nome)
    for linha in tabela.get("correspondencias_provincias") or []:
        for dest in linha.get("provincias_2024_resultantes") or []:
            if _norm(dest.get("nome")) == alvo:
                return dest.get("tipo")
    return None


def circulo_2016_de(nome_2024: str, de_para: dict | None = None) -> str | None:
    """Província de 2016 de origem quando o mapeamento é único. Icolo e Bengo tem duas origens."""
    tabela = de_para if de_para is not None else _de_para()
    alvo = _norm(nome_2024)
    origens: list[str] = []
    for linha in tabela.get("correspondencias_provincias") or []:
        origem = linha.get("provincia_2016")
        for dest in linha.get("provincias_2024_resultantes") or []:
            if _norm(dest.get("nome")) == alvo and origem:
                origens.append(origem)
    unicas = list(dict.fromkeys(origens))
    if len(unicas) == 1:
        return unicas[0]
    return None


def selo_votos(
    *,
    nivel: str,
    versao: str,
    nome: str,
    codigo_dpa: str | None,
    cne_por_codigo: dict,
    de_para: dict | None = None,
    permite_municipal_oficial: bool = False,
) -> str:
    """OFICIAL só no círculo provincial com acta CNE e território comparável a 2016."""
    grao = (nivel or "provincia").lower()
    if grao in NIVEIS_SEM_VOTO_CNE:
        if permite_municipal_oficial:
            return "OFICIAL" if codigo_dpa and codigo_dpa in cne_por_codigo else "AUSENTE"
        return "AUSENTE"
    if not codigo_dpa or codigo_dpa not in cne_por_codigo:
        return "AUSENTE"
    if "2016" in versao:
        return "OFICIAL"
    tipo = tipo_correspondencia_2024(nome, de_para)
    if tipo == "INALTERADA":
        return "OFICIAL"
    return "AUSENTE"


def _cne_por_nome(cne_lista: list[dict]) -> dict:
    return {_norm(item.get("provincia")): item for item in cne_lista if item.get("provincia")}


def margem_circulo_2016(nome_circulo: str | None, cne_lista: list[dict]) -> float | None:
    if not nome_circulo:
        return None
    item = _cne_por_nome(cne_lista).get(_norm(nome_circulo))
    if not item:
        return None
    return item.get("margem_perc")


def enriquecer_unidades(
    geojson: dict,
    *,
    versao: str,
    cne_lista: list[dict],
    ine_lista: list[dict],
    de_para: dict,
    ancorar,
) -> list[dict]:
    cne_por_codigo = {item.get("codigo_cne"): item for item in cne_lista}
    ine_por_codigo = {item.get("codigo_ine"): item for item in ine_lista}
    permite_municipal = fonte_municipal_cne_documentada()
    features = []
    for feature in geojson.get("features") or []:
        feature = ancorar(feature)
        props = dict(feature.get("properties") or {})
        nivel = (props.get("nivel") or props.get("tipo") or "provincia").lower()
        nome = props.get("nome") or props.get("provincia") or "Território"
        codigo = props.get("codigo_dpa")
        votos = selo_votos(
            nivel=nivel,
            versao=versao,
            nome=nome,
            codigo_dpa=codigo,
            cne_por_codigo=cne_por_codigo,
            de_para=de_para,
            permite_municipal_oficial=permite_municipal,
        )
        cne_data = cne_por_codigo.get(codigo, {}) if votos == "OFICIAL" else {}
        ine_data = ine_por_codigo.get(codigo, {}) if votos == "OFICIAL" else {}

        votos_a = cne_data.get("votos_partido_a", 0)
        votos_b = cne_data.get("votos_partido_b", 0)
        votos_val = cne_data.get("votos_validos", 0)
        stats = _zone(votos_a, votos_b, votos_val) if votos == "OFICIAL" else None

        hondt_res = (
            simular_hondt_provincial(
                votos_a, votos_b, max(0, votos_val - (votos_a + votos_b)), "Nosso Partido", "Oposição"
            )
            if votos == "OFICIAL" and (votos_a or votos_b)
            else {"assentos": {}, "disputa_proxima_cadeira": {}}
        )
        hondt_disputa_a = hondt_res.get("disputa_proxima_cadeira", {}).get("Nosso Partido", {})
        votos_virar = hondt_disputa_a.get("votos_para_proximo_assento")
        volatilidade = hondt_disputa_a.get("volatilidade_cadeira", "MEDIA") if votos == "OFICIAL" else None

        eleitores = cne_data.get("eleitores_registados") or 0
        abstencao = cne_data.get("abstencao_perc")
        juventude = ine_data.get("jovens_perc_eleitorado")
        prio_info = None
        if votos == "OFICIAL":
            prio_info = calcular_indice_prioridade_completo(
                eleitores_aptos=eleitores,
                margem_apurada_perc=stats["margem_perc"],
                abstencao_perc=abstencao,
                juventude_perc=juventude,
                nome_territorio=nome,
                votos_para_virar_cadeira=votos_virar,
            )

        circulo = None
        if votos != "OFICIAL":
            circulo = circulo_2016_de(nome, de_para) if "2024" in versao else None

        feature_props = {
            **props,
            "nivel": "provincia" if nivel == "provincia" else nivel,
            "proveniencia_votos": votos,
            "componentes_ausentes": ["votos_cne_2022"] if votos != "OFICIAL" else (prio_info or {}).get("componentes_ausentes") or [],
        }
        if votos == "OFICIAL" and stats and prio_info:
            feature_props.update(
                {
                    "populacao_total": ine_data.get("populacao_total"),
                    "populacao_18_mais": ine_data.get("populacao_18_mais"),
                    "juventude_perc": juventude,
                    "eleitores_cne": eleitores,
                    "abstencao_perc": abstencao,
                    "margem_apurada_perc": stats["margem_perc"],
                    "zonamento": stats["zonamento"],
                    "formula_explicativa": stats["formula_aplicada"],
                    "score_prioridade": prio_info["score_prioridade"],
                    "potencial_voto": prio_info["potencial_voto"],
                    "competitividade": prio_info["competitividade"],
                    "custo_logistico_fator": prio_info["custo_logistico"]["fator"],
                    "custo_logistico_dificuldade": prio_info["custo_logistico"]["dificuldade"],
                    "custo_logistico_modal": prio_info["custo_logistico"]["modal"],
                    "custo_logistico_descricao": prio_info["custo_logistico"]["descricao"],
                    "hondt_deputados": hondt_res.get("assentos", {}),
                    "hondt_votos_proxima_cadeira": votos_virar,
                    "hondt_volatilidade_cadeira": volatilidade,
                    "formula_prioridade": prio_info["formula_aplicada"],
                    "proveniencia_prioridade": prio_info.get("proveniencia", "ESTIMADO"),
                    "proveniencia_dados": "OFICIAL",
                }
            )
        else:
            feature_props.update(
                {
                    "proveniencia_dados": "SIMULADO",
                    "provincia": props.get("provincia") or circulo,
                    "margem_circulo_perc": margem_circulo_2016(circulo, cne_lista),
                    "circulo_2016": circulo,
                    "aviso_grao": (
                        "Sem acta CNE para este polígono. "
                        + (f"O círculo de {circulo} em 2022 não é este território." if circulo else "Não se redistribuem votos pelo de-para.")
                    ),
                }
            )
        features.append({**feature, "properties": feature_props})
    return features


def _feature_municipio(item: dict, cne_lista: list[dict]) -> dict:
    provincia = item.get("provincia")
    circulo = item.get("circulo_2016") or provincia
    lon, lat = item["centroide"]
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
        "properties": {
            "nivel": "municipio",
            "nome": item["nome"],
            "provincia": provincia,
            "codigo_dpa": item.get("codigo"),
            "populacao_total": item.get("populacao_total"),
            "populacao_18_mais": item.get("populacao_18_mais"),
            "juventude_perc": item.get("juventude_perc"),
            "proveniencia_votos": "AUSENTE",
            "proveniencia_dados": item.get("proveniencia_populacao") or "ESTIMADO",
            "proveniencia_geometria": item.get("proveniencia_geometria") or "ESTIMADO",
            "geometria_fonte": item.get("fonte_centroide") or "referencia_geografica",
            "margem_circulo_perc": margem_circulo_2016(circulo, cne_lista),
            "circulo_2016": circulo,
        },
    }


def _feature_local(item: dict, nivel: str, municipio: str, provincia: str, cne_lista: list[dict]) -> dict:
    lon, lat = item["centroide"]
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
        "properties": {
            "nivel": nivel,
            "nome": item["nome"],
            "municipio": municipio,
            "provincia": provincia,
            "proveniencia_votos": "AUSENTE",
            "proveniencia_dados": "AUSENTE",
            "proveniencia_geometria": item.get("proveniencia_geometria") or "OSM",
            "geometria_fonte": item.get("fonte") or "osm",
            "margem_circulo_perc": margem_circulo_2016(provincia, cne_lista),
            "circulo_2016": provincia,
        },
    }


def colecao_municipios() -> dict:
    catalogo = _municipios_operacao()
    cne_lista = _cne_2022().get("provincias", [])
    features = [_feature_municipio(item, cne_lista) for item in catalogo.get("municipios") or []]
    if not fonte_municipal_cne_documentada():
        for feat in features:
            feat["properties"]["proveniencia_votos"] = "AUSENTE"
            feat["properties"].pop("margem_apurada_perc", None)
            feat["properties"].pop("zonamento", None)
    return {
        "type": "FeatureCollection",
        "name": "municipios_operacao",
        "proveniencia": "AUSENTE",
        "proveniencia_votos": "AUSENTE",
        "nota": catalogo.get("metadados", {}).get("nota") or NOTA_SEM_VOTO_MUNICIPAL,
        "features": features,
    }


def colecao_local(municipio: str) -> dict:
    malha = _malha_local()
    cne_lista = _cne_2022().get("provincias", [])
    chave = _norm(municipio)
    bloco = None
    for nome, dados in (malha.get("municipios") or {}).items():
        if _norm(nome) == chave:
            bloco = {**dados, "nome": nome}
            break
    if bloco is None:
        return {
            "municipio": municipio,
            "nota": f"Sem malha local publicada para {municipio}. A CNE não divulgou votos neste nível.",
            "proveniencia_votos": "AUSENTE",
            "comunas": {"type": "FeatureCollection", "features": []},
            "bairros": {"type": "FeatureCollection", "features": []},
        }
    provincia = bloco.get("provincia") or "Luanda"
    nome_mun = bloco.get("nome") or municipio
    comunas = [
        _feature_local(item, "comuna", nome_mun, provincia, cne_lista) for item in bloco.get("comunas") or []
    ]
    bairros = [
        _feature_local(item, "bairro", nome_mun, provincia, cne_lista) for item in bloco.get("bairros") or []
    ]
    return {
        "municipio": nome_mun,
        "provincia": provincia,
        "nota": malha.get("metadados", {}).get("nota") or NOTA_SEM_VOTO_LOCAL,
        "proveniencia_votos": "AUSENTE",
        "comunas": {"type": "FeatureCollection", "features": comunas},
        "bairros": {"type": "FeatureCollection", "features": bairros},
    }
