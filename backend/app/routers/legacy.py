import hashlib
import json
import logging
import re
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Annotated
from uuid import UUID

from anthropic import Anthropic
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import FileResponse
from psycopg import Error

from war_room.assinatura_eleitoral import (
    montar_digest_canonico_ata,
    verificar_assinatura_ed25519,
)
from war_room.custo_logistico import (
    calcular_indice_prioridade_completo,
)
from war_room.motor_hondt import (
    simular_hondt_provincial,
)

from ..schemas import (
    AtaSubmissionRequest,
    HondtSimulationRequest,
    LegalCaseCreateRequest,
    SpeechGenerateRequest,
    SpeechStatusUpdateRequest,
    ZoningRequest,
)
from ..security import require_roles

router = APIRouter(prefix="/api", tags=["legacy-compatible"])
logger = logging.getLogger("angola.api")
ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "data" / "raw"
GEO_ANGOLA = ROOT / "geo_angola"
ROLE_REVIEW = require_roles("ADMIN", "ANALISTA")
ROLE_FIELD = require_roles("ADMIN", "COORDENADOR", "BRIGADISTA")


def _zone(votes_party: int, votes_opposition: int, valid: int, bastion: float = 15, opposition: float = -15):
    party_pct = round(votes_party / valid * 100, 2) if valid else 0.0
    opposition_pct = round(votes_opposition / valid * 100, 2) if valid else 0.0
    margin = round(party_pct - opposition_pct, 2)
    zone = "BASTIAO" if margin >= bastion and valid else "OPOSICAO" if margin <= opposition and valid else "CAMPO_BATALHA"
    return {
        "zonamento": zone,
        "margem_perc": margin,
        "votos_partido_perc": party_pct,
        "votos_oposicao_perc": opposition_pct,
        "formula_aplicada": f"Margem = {party_pct}% - {opposition_pct}% = {margin} p.p.",
        "parametros_utilizados": {"limiar_bastiao_margem": bastion, "limiar_oposicao_margem": opposition},
    }


def _read_json(path: Path, default=None):
    if not path.is_file():
        return default
    with path.open(encoding="utf-8") as source:
        return json.load(source)


@lru_cache(maxsize=1)
def _geometrias_geo_angola() -> dict:
    dados = _read_json(GEO_ANGOLA / "geoBoundaries-AGO-ADM1_simplified.geojson") or {}
    return {
        (feat.get("properties") or {}).get("shapeName"): feat.get("geometry")
        for feat in dados.get("features") or []
        if (feat.get("properties") or {}).get("shapeName") and feat.get("geometry")
    }


def _ancorar_geometria(feature: dict) -> dict:
    """Usa o traçado de geo_angola quando o nome coincide; não inventa fronteiras da DPA 2024."""
    props = dict(feature.get("properties") or {})
    nome = props.get("nome") or props.get("provincia")
    real = _geometrias_geo_angola().get(nome)
    if real:
        props["geometria_fonte"] = "geo_angola"
        props["proveniencia_geometria"] = "OFICIAL"
        return {**feature, "geometry": real, "properties": props}
    centro = props.get("centroide")
    if isinstance(centro, list) and len(centro) >= 2:
        props["geometria_fonte"] = "centroide_estimado"
        props["proveniencia_geometria"] = "SIMULADO"
        return {
            **feature,
            "geometry": {"type": "Point", "coordinates": [float(centro[0]), float(centro[1])]},
            "properties": props,
        }
    props["geometria_fonte"] = "esquema"
    props["proveniencia_geometria"] = "SIMULADO"
    return {**feature, "properties": props}


@router.get("/locais-proximos")
def nearby_polling_places(
    request: Request,
    longitude: float = Query(ge=-180, le=180),
    latitude: float = Query(ge=-90, le=90),
    raio_metros: float = Query(default=2000, ge=100, le=50000),
    limite: int = Query(default=50, ge=1, le=200),
    zonamento: str | None = None,
    formato: str | None = None,
):
    query = """
        SELECT id, codigo_cne, nome, provincia, municipio, comuna_distrito,
               bairro_aldeia, total_mesas, total_eleitores_aptos, zonamento_historico,
               round(ST_Distance(localizacao,
                   ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography)::numeric, 1) AS distancia_metros,
               ST_X(localizacao::geometry) AS longitude,
               ST_Y(localizacao::geometry) AS latitude
        FROM locais_voto
        WHERE ST_DWithin(localizacao,
              ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
    """
    params: list = [longitude, latitude, longitude, latitude, raio_metros]
    if zonamento:
        valid_zones = {"BASTIAO", "CAMPO_BATALHA", "OPOSICAO"}
        if zonamento.upper() not in valid_zones:
            raise HTTPException(status_code=422, detail="Valor de zonamento inválido.")
        query += " AND zonamento_historico = %s"
        params.append(zonamento.upper())
    query += " ORDER BY distancia_metros LIMIT %s"
    params.append(limite)
    with request.app.state.db_pool.connection() as connection:
        rows = connection.execute(query, params).fetchall()
    if formato == "geojson":
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [row["longitude"], row["latitude"]]},
                    "properties": {
                        "id": str(row["id"]),
                        "nome": row["nome"],
                        "codigo_cne": row["codigo_cne"],
                        "provincia": row["provincia"],
                        "municipio": row["municipio"],
                        "total_eleitores": row["total_eleitores_aptos"],
                        "zonamento": row["zonamento_historico"],
                        "distancia_metros": float(row["distancia_metros"]),
                    },
                }
                for row in rows
            ],
        }
    return {
        "sucesso": True,
        "parametros_busca": {
            "origem": {"longitude": longitude, "latitude": latitude},
            "raio_metros": raio_metros,
            "total_encontrados": len(rows),
        },
        "locais": rows,
    }


@router.get("/locais-voto/{place_id}")
def get_polling_place(place_id: UUID, request: Request):
    with request.app.state.db_pool.connection() as connection:
        row = connection.execute(
            """
            SELECT id, codigo_cne, nome, provincia, municipio, comuna_distrito,
                   bairro_aldeia, total_mesas, total_eleitores_aptos,
                   zonamento_historico, ST_X(localizacao::geometry) AS longitude,
                   ST_Y(localizacao::geometry) AS latitude, criado_em
            FROM locais_voto WHERE id = %s
            """,
            (place_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Assembleia de voto não encontrada.")
    return {"sucesso": True, "local": row}


@router.get("/municipios/{municipio}/resumo")
def municipality_summary(
    municipio: str,
    request: Request,
    user: Annotated[dict, Depends(ROLE_FIELD)],
    campanha_id: UUID | None = None,
):
    if campanha_id and str(campanha_id) != user["campaign_id"]:
        raise HTTPException(status_code=403, detail="A campanha não corresponde ao token autenticado.")
    campaign_id = UUID(user["campaign_id"])
    with request.app.state.db_pool.connection() as connection:
        place_stats = connection.execute(
            """
            SELECT count(*) AS total_assembleias,
                   coalesce(sum(total_eleitores_aptos), 0) AS total_eleitores,
                   count(*) FILTER (WHERE zonamento_historico = 'BASTIAO') AS bastioes,
                   count(*) FILTER (WHERE zonamento_historico = 'CAMPO_BATALHA') AS campos_batalha,
                   count(*) FILTER (WHERE zonamento_historico = 'OPOSICAO') AS oposicao,
                   round(ST_X(ST_Centroid(ST_Collect(localizacao::geometry)))::numeric, 4) AS centro_lon,
                   round(ST_Y(ST_Centroid(ST_Collect(localizacao::geometry)))::numeric, 4) AS centro_lat
            FROM locais_voto WHERE lower(municipio) = lower(%s)
            """,
            (municipio,),
        ).fetchone()
        campaign_filter = " AND vt.campanha_id = %s"
        visit_params = (municipio, campaign_id)
        visits = connection.execute(
            f"""
            SELECT count(*) AS total_visitas,
                count(*) FILTER (WHERE sentimento = 'POSITIVO') AS positivo,
                count(*) FILTER (WHERE sentimento = 'NEUTRO') AS neutro,
                count(*) FILTER (WHERE sentimento = 'NEGATIVO') AS negativo,
                count(*) FILTER (WHERE eleitor_jovem) AS jovens
            FROM visitas_terreno vt JOIN locais_voto lv
              ON ST_DWithin(vt.localizacao, lv.localizacao, 3000)
            WHERE lower(lv.municipio) = lower(%s){campaign_filter}
            """,
            visit_params,
        ).fetchone()
        concerns = connection.execute(
            f"""
            SELECT concern AS dor, count(*) AS frequencia
            FROM visitas_terreno vt
            JOIN locais_voto lv ON ST_DWithin(vt.localizacao, lv.localizacao, 3000)
            CROSS JOIN LATERAL unnest(vt.dores_prioritarias) AS concern
            WHERE lower(lv.municipio) = lower(%s){campaign_filter}
            GROUP BY concern ORDER BY frequencia DESC LIMIT 5
            """,
            visit_params,
        ).fetchall()

    n = visits["total_visitas"]
    positive_pct = round(visits["positivo"] * 100 / n) if n else 0
    negative_pct = round(visits["negativo"] * 100 / n) if n else 0
    if positive_pct >= 55:
        risk = {"cor": "🟢", "status": "BASTIAO", "rotulo": "Zona Segura / Bastião"}
    elif negative_pct >= 45:
        risk = {"cor": "🔴", "status": "OPOSICAO", "rotulo": "Zona Crítica / Oposição"}
    else:
        risk = {"cor": "🟡", "status": "CAMPO_BATALHA", "rotulo": "Zona em Disputa"}
    return {
        "sucesso": True,
        "municipio": municipio,
        "coordenadas": {
            "longitude": float(place_stats["centro_lon"]) if place_stats and place_stats["centro_lon"] is not None else None,
            "latitude": float(place_stats["centro_lat"]) if place_stats and place_stats["centro_lat"] is not None else None,
        },
        "indicador_risco": risk,
        "amostragem_estatistica": {"n_amostra": n, "nivel_confianca": "95%", "representatividade": "AMOSTRA_EXPLORATORIA" if n < 30 else "INDICATIVA"},
        "estrutura_eleitoral": {
            "total_assembleias": place_stats["total_assembleias"],
            "total_eleitores_aptos": place_stats["total_eleitores"],
            "zonamento_base": {
                "bastioes": place_stats["bastioes"],
                "campos_batalha": place_stats["campos_batalha"],
                "oposicao": place_stats["oposicao"],
            },
        },
        "inteligencia_campo": {
            "total_visitas": n,
            "amostra_info": f"n = {n}" + (" (indicativa)" if n < 30 else ""),
            "sentimento": {
                "positivo": {"total": visits["positivo"], "perc": positive_pct},
                "neutro": {"total": visits["neutro"], "perc": round(visits["neutro"] * 100 / n) if n else 0},
                "negativo": {"total": visits["negativo"], "perc": negative_pct},
            },
            "demografia_jovem": {
                "total_18_35": visits["jovens"],
                "perc_juventude": round(visits["jovens"] * 100 / n) if n else 0,
            },
            "principais_dores": concerns,
        },
    }


@router.get("/war-room/resumo-nacional")
def national_summary(
    request: Request,
    user: Annotated[dict, Depends(ROLE_REVIEW)],
    campanha_id: UUID | None = None,
):
    if campanha_id and str(campanha_id) != user["campaign_id"]:
        raise HTTPException(status_code=403, detail="A campanha não corresponde ao token autenticado.")
    campaign_id = UUID(user["campaign_id"])
    campaign_clause = " WHERE campanha_id = %s"
    params = (campaign_id,)
    with request.app.state.db_pool.connection() as connection:
        totals = connection.execute(
            f"""
            SELECT count(*) AS total_visitas,
                count(*) FILTER (WHERE sentimento = 'POSITIVO') AS positivas,
                count(*) FILTER (WHERE sentimento = 'NEUTRO') AS neutras,
                count(*) FILTER (WHERE sentimento = 'NEGATIVO') AS negativas,
                count(*) FILTER (WHERE eleitor_jovem) AS jovens,
                count(DISTINCT ativista_id) AS ativistas_ativos,
                min(registado_em) AS primeira_visita, max(registado_em) AS ultima_visita
            FROM visitas_terreno{campaign_clause}
            """,
            params,
        ).fetchone()
        concerns = connection.execute(
            f"""
            SELECT concern AS dor, count(*) AS frequencia
            FROM visitas_terreno vt
            CROSS JOIN LATERAL unnest(vt.dores_prioritarias) AS concern
            {campaign_clause}
            GROUP BY concern ORDER BY frequencia DESC LIMIT 6
            """,
            params,
        ).fetchall()
        provinces = connection.execute(
            """
            SELECT provincia, count(*) AS total_assembleias,
                   coalesce(sum(total_eleitores_aptos), 0) AS eleitores_provincia
            FROM locais_voto GROUP BY provincia ORDER BY eleitores_provincia DESC
            """
        ).fetchall()
    n = totals["total_visitas"]
    def percentage(field: str) -> int:
        return round(totals[field] * 100 / n) if n else 0
    return {
        "sucesso": True,
        "gerado_em": datetime.now(UTC).isoformat(),
        "painel_nacional": {
            "total_visitas": n,
            "ativistas_em_campo": totals["ativistas_ativos"],
            "indice_aceitacao": percentage("positivas"),
            "indice_rejeicao": percentage("negativas"),
            "indice_indecisos": percentage("neutras"),
            "peso_juventude": percentage("jovens"),
            "primeira_visita": totals["primeira_visita"],
            "ultima_visita": totals["ultima_visita"],
        },
        "ranking_nacional_dores": concerns,
        "distribuicao_provincias": provinces,
    }


@router.post("/zonamento/simular")
def simulate_zoning(body: ZoningRequest):
    if body.limiar_oposicao >= body.limiar_bastiao:
        raise HTTPException(status_code=422, detail="O limiar de oposição deve ser menor que o limiar de bastião.")
    return {
        "sucesso": True,
        "resultado": _zone(
            body.votos_partido, body.votos_oposicao, body.total_validos,
            body.limiar_bastiao, body.limiar_oposicao,
        ),
        "regra_padrao": {
            "codigo": "MARGEM_BIDIRECIONAL_CNE_V1",
            "limiar_bastiao_margem": 15.0,
            "limiar_oposicao_margem": -15.0,
        },
    }


@router.get("/territorio/relatorio-qualidade")
def territory_quality_report():
    return {
        "sucesso": True,
        "relatorio": _read_json(ROOT / "data" / "relatorio_qualidade_carga.json", {
            "status": "PENDENTE_EXECUCAO",
            "mensagem": "O pipeline ETL ainda não foi executado neste ambiente.",
        }),
    }


@router.get("/territorio/versoes")
def territory_versions():
    versions = _read_json(RAW / "versoes_malha.json")
    if versions:
        return {"sucesso": True, "versoes": versions, "proveniencia": "OFICIAL"}
    return {
        "sucesso": True,
        "proveniencia": "OFICIAL",
        "versoes": [
            {"codigo": "DPA_2016_18P", "nome": "DPA Lei 18/16 (18 Províncias)", "ano_vigencia": 2016, "total_provincias": 18, "total_municipios": 164},
            {"codigo": "DPA_2024_21P", "nome": "Nova DPA 2024 (21 Províncias)", "ano_vigencia": 2024, "total_provincias": 21, "total_municipios": 325},
        ],
    }


def _pct(eleicao: dict, sigla: str) -> float | None:
    for partido in eleicao.get("partidos") or []:
        if partido.get("sigla") == sigla:
            return partido.get("percentagem_validos")
    return None


@router.get("/eleicoes/serie-historica")
def historical_election_series():
    """Totais nacionais oficiais 2012, 2017 e 2022. Sem resultados municipais inventados."""
    serie = _read_json(RAW / "serie_historica_eleicoes_cne.json")
    if not serie or not serie.get("eleicoes"):
        raise HTTPException(status_code=503, detail="Série histórica eleitoral indisponível.")

    eleicoes = serie["eleicoes"]
    tendencia = []
    for anterior, seguinte in zip(eleicoes, eleicoes[1:], strict=False):
        delta = {"de": anterior["ano"], "para": seguinte["ano"], "unidade": "pontos_percentuais"}
        for sigla in ("MPLA", "UNITA"):
            a, b = _pct(anterior, sigla), _pct(seguinte, sigla)
            if a is not None and b is not None:
                delta[sigla] = round(b - a, 3)
        abst_a, abst_b = anterior.get("abstencao_perc"), seguinte.get("abstencao_perc")
        if abst_a is not None and abst_b is not None:
            delta["abstencao"] = round(abst_b - abst_a, 2)
        tendencia.append(delta)

    return {
        "sucesso": True,
        "proveniencia": serie.get("metadados", {}).get("proveniencia", "OFICIAL"),
        "nivel_completo": "NACIONAL",
        "serie": serie,
        "tendencia_pp": tendencia,
    }


@router.get("/eleicoes/hondt-provincias")
def hondt_provincial_overview():
    """Retorna a distribuição de 5 deputados por círculo provincial em Angola com cálculo de votos para próxima cadeira."""
    cne = _read_json(RAW / "resultados_eleitorais_cne_2022.json", {})
    provincias = cne.get("provincias", [])
    if not provincias:
        raise HTTPException(status_code=503, detail="Dados de apuramento provincial indisponíveis.")

    resultados = []
    totais_deputados = {"partido_a": 0, "partido_b": 0, "outros": 0}
    for prov in provincias:
        votos_a = prov.get("votos_partido_a", 0)
        votos_b = prov.get("votos_partido_b", 0)
        votos_val = prov.get("votos_validos", 0)
        outros = max(0, votos_val - (votos_a + votos_b))
        sim = simular_hondt_provincial(votos_a, votos_b, outros, "MPLA", "UNITA", assentos_circulo=5)
        totais_deputados["partido_a"] += sim["assentos"].get("MPLA", 0)
        totais_deputados["partido_b"] += sim["assentos"].get("UNITA", 0)
        totais_deputados["outros"] += sim["assentos"].get("Outras Forças", 0)

        resultados.append({
            "codigo_cne": prov.get("codigo_cne"),
            "provincia": prov.get("provincia"),
            "votos_validos": votos_val,
            "abstencao_perc": prov.get("abstencao_perc"),
            "assentos": sim["assentos"],
            "quociente_corte": sim["quociente_corte"],
            "disputa_proxima_cadeira": sim["disputa_proxima_cadeira"],
            "resumo": sim["resumo_verbal"],
        })

    return {
        "sucesso": True,
        "proveniencia": "OFICIAL_CNE_2022",
        "metodo": "HONDT",
        "assentos_por_circulo": 5,
        "total_provincias": len(resultados),
        "total_deputados_provinciais": totais_deputados,
        "provincias": resultados,
    }


@router.post("/eleicoes/hondt-simulador")
def hondt_simulator(payload: HondtSimulationRequest):
    """Simula a atribuição de assentos pelo Método de Hondt para qualquer cenário ou choque de votação."""
    votos_a = payload.votos_partido_a
    votos_b = payload.votos_partido_b
    votos_outros = payload.votos_outros or 0

    dados_base_oficial = None
    if payload.provincia:
        cne = _read_json(RAW / "resultados_eleitorais_cne_2022.json", {}).get("provincias", [])
        prov_match = next((p for p in cne if p.get("provincia", "").lower() == payload.provincia.lower() or p.get("codigo_cne", "").lower() == payload.provincia.lower()), None)
        if prov_match:
            dados_base_oficial = prov_match
            if votos_a is None:
                votos_a = prov_match.get("votos_partido_a", 0)
            if votos_b is None:
                votos_b = prov_match.get("votos_partido_b", 0)
            if not votos_outros:
                votos_val = prov_match.get("votos_validos", 0)
                votos_outros = max(0, votos_val - (votos_a + votos_b))

    v_a = max(0, int(votos_a or 0))
    v_b = max(0, int(votos_b or 0))

    if payload.variacao_a_perc != 0.0:
        v_a = int(v_a * (1.0 + payload.variacao_a_perc / 100.0))
    if payload.variacao_b_perc != 0.0:
        v_b = int(v_b * (1.0 + payload.variacao_b_perc / 100.0))

    simulacao = simular_hondt_provincial(
        votos_partido_a=v_a,
        votos_partido_b=v_b,
        votos_outros=votos_outros,
        nome_partido_a=payload.nome_partido_a,
        nome_partido_b=payload.nome_partido_b,
        assentos_circulo=payload.assentos,
    )

    return {
        "sucesso": True,
        "parametros": {
            "provincia": payload.provincia,
            "variacao_a_perc": payload.variacao_a_perc,
            "variacao_b_perc": payload.variacao_b_perc,
            "assentos": payload.assentos,
        },
        "votos_aplicados": {
            payload.nome_partido_a: v_a,
            payload.nome_partido_b: v_b,
            "Outras Forças": votos_outros,
        },
        "dados_base_oficial": dados_base_oficial,
        "resultado": simulacao,
    }


@router.get("/territorio/correspondencia")
def territory_correspondence():
    data = _read_json(RAW / "de_para_dpa_2016_2024.json")
    if data is None:
        raise HTTPException(status_code=404, detail="Tabela de correspondência não encontrada.")
    return {"sucesso": True, "de_para": data}


@router.get("/territorio/contorno-nacional")
def national_outline():
    """Limite territorial nacional de Angola gerado a partir dos arquivos da pasta geo_angola."""
    source = GEO_ANGOLA / "contorno_nacional.geojson"
    if not source.is_file():
        source = GEO_ANGOLA / "geoBoundaries-AGO-ADM1_simplified.geojson"
    if not source.is_file():
        raise HTTPException(status_code=404, detail="Arquivos territoriais da pasta geo_angola indisponíveis.")
    return FileResponse(source, media_type="application/geo+json")


@router.get("/territorio/geo-angola")
def geo_angola_malha(arquivo: str = "simplificado"):
    """Fornece os arquivos GeoJSON diretamente da pasta geo_angola."""
    mapa_arquivos = {
        "simplificado": "geoBoundaries-AGO-ADM1_simplified.geojson",
        "completo": "geoBoundaries-AGO-ADM1.geojson",
        "contorno": "contorno_nacional.geojson",
    }
    nome = mapa_arquivos.get(arquivo, "geoBoundaries-AGO-ADM1_simplified.geojson")
    source = GEO_ANGOLA / nome
    if not source.is_file():
        raise HTTPException(status_code=404, detail=f"Arquivo {nome} não encontrado na pasta geo_angola.")
    return FileResponse(source, media_type="application/geo+json")


@router.get("/territorio/unidades")
def territory_units(
    request: Request,
    versao: str = "DPA_2016_18P",
    formato: str = "json",
    plano: str | None = Query(default=None),
    territorio: str | None = Query(default=None),
    x_plano_campanha: str | None = Header(default=None),
):
    if versao not in {"DPA_2016_18P", "DPA_2024_21P"}:
        raise HTTPException(status_code=404, detail=f"Versão {versao} não encontrada.")
    if formato not in {"json", "geojson"}:
        raise HTTPException(status_code=422, detail="formato deve ser json ou geojson.")

    from war_room.planos_comerciais import nomes_no_ambito, unidade_no_ambito

    from .plans import exigir_funcionalidade, resolver_plano_request

    plano_codigo = resolver_plano_request(x_plano_campanha, plano)
    if "2016" in versao and plano_codigo == "MUNICIPAL":
        exigir_funcionalidade(plano_codigo, "malha_dupla_dpa")

    source = RAW / ("malha_angola_dpa2024.geojson" if "2024" in versao else "malha_angola_dpa2016.geojson")
    geojson = _read_json(source)
    if not geojson or not isinstance(geojson.get("features"), list):
        raise HTTPException(status_code=503, detail="Arquivo territorial indisponível ou inválido.")
    cne = _read_json(RAW / "resultados_eleitorais_cne_2022.json", {}).get("provincias", [])
    ine = _read_json(RAW / "populacao_projecoes_ine.json", {}).get("provincias", [])
    cne_by_code = {item.get("codigo_cne"): item for item in cne}
    ine_by_code = {item.get("codigo_ine"): item for item in ine}
    features = []
    for feature in geojson["features"]:
        feature = _ancorar_geometria(feature)
        props = feature.get("properties", {})
        cne_data = cne_by_code.get(props.get("codigo_dpa"), {})
        ine_data = ine_by_code.get(props.get("codigo_dpa"), {})
        votos_a = cne_data.get("votos_partido_a", 0)
        votos_b = cne_data.get("votos_partido_b", 0)
        votos_val = cne_data.get("votos_validos", 0)
        stats = _zone(votos_a, votos_b, votos_val)

        nome_unidade = props.get("nome") or props.get("provincia") or "Território"
        hondt_res = (
            simular_hondt_provincial(votos_a, votos_b, max(0, votos_val - (votos_a + votos_b)), "Nosso Partido", "Oposição")
            if (votos_a or votos_b)
            else {"assentos": {}, "disputa_proxima_cadeira": {}}
        )
        hondt_disputa_a = hondt_res.get("disputa_proxima_cadeira", {}).get("Nosso Partido", {})
        votos_virar = hondt_disputa_a.get("votos_para_proximo_assento")
        volatilidade = hondt_disputa_a.get("volatilidade_cadeira", "MEDIA")

        eleitores = cne_data.get("eleitores_registados") or 0
        abstencao = cne_data.get("abstencao_perc") or 50.0
        juventude = ine_data.get("jovens_perc_eleitorado") or 60.0
        prio_info = calcular_indice_prioridade_completo(
            eleitores_aptos=eleitores,
            margem_apurada_perc=stats["margem_perc"],
            abstencao_perc=abstencao,
            juventude_perc=juventude,
            nome_territorio=nome_unidade,
            votos_para_virar_cadeira=votos_virar,
        )

        feature_props = {
            **props,
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
            "proveniencia_dados": "OFICIAL" if cne_data else "SIMULADO",
        }
        features.append({**feature, "properties": feature_props})

    ambito = nomes_no_ambito(plano_codigo, territorio)
    if not ambito.get("irrestrito"):
        features = [f for f in features if unidade_no_ambito(f.get("properties") or {}, ambito)]

    if formato == "geojson":
        return {
            "type": "FeatureCollection",
            "name": f"malha_{versao}",
            "proveniencia": "OFICIAL",
            "features": features,
        }
    return {
        "sucesso": True,
        "versao": versao,
        "total": len(features),
        "unidades": [feature["properties"] for feature in features],
    }


@router.get("/dia-d/apuramento-paralelo")
def election_count(
    request: Request,
    user: Annotated[dict, Depends(ROLE_REVIEW)],
    campanha_id: UUID | None = None,
    x_plano_campanha: str | None = Header(default=None),
    plano: str | None = Query(default=None),
):
    from .plans import exigir_funcionalidade, resolver_plano_request

    plano_codigo = resolver_plano_request(x_plano_campanha, plano)
    exigir_funcionalidade(plano_codigo, "dia_d")

    if campanha_id and str(campanha_id) != user["campaign_id"]:
        raise HTTPException(status_code=403, detail="A campanha não corresponde ao token autenticado.")
    campaign_id = UUID(user["campaign_id"])
    campaign_clause = " WHERE campanha_id = %s"
    params = (campaign_id,)
    with request.app.state.db_pool.connection() as connection:
        totals = connection.execute(
            f"""
            SELECT count(*) AS total_atas_recebidas,
                count(DISTINCT local_voto_id) AS assembleias_apuradas,
                coalesce(sum(votos_favoraveis), 0) AS total_favoraveis,
                coalesce(sum(votos_oponentes), 0) AS total_oponentes,
                coalesce(sum(votos_nulos), 0) AS total_nulos,
                coalesce(sum(votos_brancos), 0) AS total_brancos,
                coalesce(sum(total_votantes), 0) AS total_votantes_computados,
                count(*) FILTER (WHERE status = 'SUSPEITA') AS total_atas_alerta_revisao
            FROM atas_apuramento{campaign_clause}
            """,
            params,
        ).fetchone()
        universe = connection.execute(
            "SELECT coalesce(sum(total_mesas), 0) AS total_mesas, coalesce(sum(total_eleitores_aptos), 0) AS eleitores FROM locais_voto"
        ).fetchone()
        suspicious = connection.execute(
            """
            SELECT aa.id, aa.mesa_numero, aa.distancia_assembleia_metros, aa.status,
                   aa.foto_hash_sha256, aa.dados_hash_sha256, aa.registado_em,
                   lv.nome AS assembleia_nome, lv.codigo_cne, lv.municipio, lv.provincia
            FROM atas_apuramento aa JOIN locais_voto lv ON aa.local_voto_id = lv.id
            WHERE aa.campanha_id = %s AND aa.status = 'SUSPEITA'
            ORDER BY aa.distancia_assembleia_metros DESC LIMIT 20
            """,
            (campaign_id,),
        ).fetchall()
    count = totals["total_atas_recebidas"]
    expected = universe["total_mesas"]
    coverage = min(100.0, round(count * 1000 / max(expected, 1)) / 10)
    uncertainty = "ALTA_INCERTEZA" if coverage < 30 else "INCERTEZA_MODERADA" if coverage < 75 else "BAIXA_INCERTEZA"
    valid = totals["total_favoraveis"] + totals["total_oponentes"]
    return {
        "sucesso": True,
        "horario_apuracao": datetime.now(UTC).isoformat(),
        "cobertura_apuracao": {
            "mesas_recebidas": count,
            "mesas_esperadas": expected,
            "cobertura_perc": coverage,
            "total_votantes_computados": totals["total_votantes_computados"],
            "grau_incerteza": uncertainty,
            "status_apuracao": "CONSOLIDAÇÃO_AVANÇADA" if coverage >= 75 else "EM_ANDAMENTO",
            "aviso_metodologico": f"Cobertura de {coverage}%; valores não são projeção oficial.",
        },
        "contagem_votos_validos": {
            "nosso_partido": {"votos": totals["total_favoraveis"], "percentual": round(totals["total_favoraveis"] * 1000 / valid) / 10 if valid else 0},
            "oposicao": {"votos": totals["total_oponentes"], "percentual": round(totals["total_oponentes"] * 1000 / valid) / 10 if valid else 0},
            "nulos": {"votos": totals["total_nulos"]},
            "brancos": {"votos": totals["total_brancos"]},
            "total_validos": valid,
        },
        "auditoria_integridade": {
            "total_atas_alerta_revisao": totals["total_atas_alerta_revisao"],
            "atas_para_revisao_humana": suspicious,
        },
    }


@router.post("/dia-d/submeter-ata")
def submit_election_record(
    payload: AtaSubmissionRequest,
    request: Request,
    user: Annotated[dict, Depends(ROLE_FIELD)],
    x_plano_campanha: str | None = Header(default=None),
    plano: str | None = Query(default=None),
):
    from .plans import exigir_funcionalidade, resolver_plano_request

    plano_codigo = resolver_plano_request(x_plano_campanha, plano)
    exigir_funcionalidade(plano_codigo, "dia_d")

    ata_id = payload.id
    place_id = payload.local_voto_id
    campaign_id = payload.campanha_id or UUID(user["campaign_id"])
    activist_id = payload.delegado_id or (UUID(user["ativista_id"]) if user.get("ativista_id") else None)
    if not activist_id:
        raise HTTPException(status_code=422, detail="delegado_id é obrigatório.")
    latitude = payload.localizacao_envio.latitude
    longitude = payload.localizacao_envio.longitude

    if str(campaign_id) != user["campaign_id"]:
        raise HTTPException(status_code=403, detail="A campanha não corresponde ao token autenticado.")
    if user["perfil"] != "ADMIN" and (
        not user.get("ativista_id") or str(activist_id) != user["ativista_id"]
    ):
        raise HTTPException(status_code=403, detail="O utilizador não está associado ao delegado informado.")
    registered = payload.registado_em.isoformat() if payload.registado_em else datetime.now(UTC).isoformat()
    canonical_bytes = montar_digest_canonico_ata(
        local_voto_id=str(place_id),
        mesa_numero=payload.mesa_numero,
        votos_favoraveis=payload.votos_favoraveis,
        votos_oponentes=payload.votos_oponentes,
        votos_nulos=payload.votos_nulos,
        votos_brancos=payload.votos_brancos,
        total_votantes=payload.total_votantes,
        foto_hash_sha256=payload.foto_hash_sha256,
        registado_em=registered,
        longitude=longitude,
        latitude=latitude,
    )
    data_hash = hashlib.sha256(canonical_bytes).hexdigest()

    assinatura_valida = False
    if payload.assinatura_digital_ed25519 and payload.chave_publica_delegado_ed25519:
        if not verificar_assinatura_ed25519(
            payload.chave_publica_delegado_ed25519,
            payload.assinatura_digital_ed25519,
            canonical_bytes,
        ):
            raise HTTPException(
                status_code=400,
                detail="Assinatura digital Ed25519 inválida para os dados apurados nesta ata.",
            )
        assinatura_valida = True
    with request.app.state.db_pool.connection() as connection:
        with connection.transaction():
            connection.execute(
                "SELECT set_config('app.current_campanha_id', %s, true)",
                (str(campaign_id),),
            )
            assigned_activist = connection.execute(
                """
                SELECT id FROM ativistas
                WHERE id = %s AND campanha_id = %s AND ativo = TRUE
                  AND (local_voto_atribuido_id IS NULL OR local_voto_atribuido_id = %s)
                """,
                (activist_id, campaign_id, place_id),
            ).fetchone()
            if not assigned_activist:
                raise HTTPException(status_code=403, detail="Delegado ou assembleia não atribuídos à campanha.")
            try:
                row = connection.execute(
                    """
                    INSERT INTO atas_apuramento (
                        id, campanha_id, local_voto_id, mesa_numero, delegado_id,
                        votos_favoraveis, votos_oponentes, votos_nulos, votos_brancos,
                        total_votantes, foto_ata_url, foto_hash_sha256, dados_hash_sha256,
                        localizacao_envio, registado_em, sincronizado_em
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, clock_timestamp()
                    )
                    ON CONFLICT (id) DO NOTHING
                    RETURNING id, status, distancia_assembleia_metros
                    """,
                    (
                        ata_id, campaign_id, place_id, payload.mesa_numero,
                        activist_id, payload.votos_favoraveis,
                        payload.votos_oponentes, payload.votos_nulos,
                        payload.votos_brancos, payload.total_votantes,
                        payload.foto_ata_url, payload.foto_hash_sha256, data_hash,
                        longitude, latitude, registered,
                    ),
                ).fetchone()
            except Error as exc:
                if getattr(exc, "sqlstate", None) == "23505":
                    raise HTTPException(status_code=409, detail="Já existe uma ata para esta mesa.") from exc
                raise
    if row is None:
        raise HTTPException(status_code=409, detail="A ata já foi recebida; não pode ser reescrita.")
    return {
        "sucesso": True,
        "mensagem": "Ata de apuramento registrada com sucesso.",
        "ata": {
            "id": str(row["id"]),
            "status": row["status"],
            "distancia_assembleia_metros": row["distancia_assembleia_metros"],
            "alerta_revisao_humana": row["status"] == "SUSPEITA",
            "assinatura_digital_verificada": assinatura_valida,
            "cadeia_custodia": "ASSINADA_DIGITALMENTE_ED25519" if assinatura_valida else "SHA256_INTEGRIDADE",
        },
    }


@router.post("/dia-d/casos-juridicos", status_code=201)
def create_legal_case(
    payload: LegalCaseCreateRequest,
    request: Request,
    user: Annotated[dict, Depends(ROLE_REVIEW)],
    x_plano_campanha: str | None = Header(default=None),
    plano: str | None = Query(default=None),
):
    from .plans import exigir_funcionalidade, resolver_plano_request

    plano_codigo = resolver_plano_request(x_plano_campanha, plano)
    exigir_funcionalidade(plano_codigo, "casos_juridicos")

    campaign = payload.campanha_id or UUID(user["campaign_id"])
    if str(campaign) != user["campaign_id"]:
        raise HTTPException(status_code=403, detail="A campanha não corresponde ao token autenticado.")
    with request.app.state.db_pool.connection() as connection:
        with connection.transaction():
            connection.execute(
                "SELECT set_config('app.current_campanha_id', %s, true)",
                (str(campaign),),
            )
            row = connection.execute(
                """
                INSERT INTO casos_juridicos (
                    campanha_id, ata_id, local_voto_id, titulo, descricao_fato,
                    tipo_irregularidade, prioridade, advogado_responsavel, anexos_urls
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    campaign, payload.ata_id, payload.local_voto_id,
                    payload.titulo, payload.descricao_fato, payload.tipo_irregularidade,
                    payload.prioridade, payload.advogado_responsavel,
                    payload.anexos_urls,
                ),
            ).fetchone()
    return {
        "sucesso": True,
        "mensagem": "Caso jurídico formal protocolado.",
        "caso": row,
        "protocolo": f"CASO-2027-{str(row['id'])[:8].upper()}",
    }


@router.get("/dia-d/casos-juridicos")
def list_legal_cases(
    request: Request,
    campanha_id: UUID,
    user: Annotated[dict, Depends(ROLE_REVIEW)],
):
    if str(campanha_id) != user["campaign_id"]:
        raise HTTPException(status_code=403, detail="A campanha não corresponde ao token autenticado.")
    with request.app.state.db_pool.connection() as connection:
        connection.execute(
            "SELECT set_config('app.current_campanha_id', %s, true)",
            (str(campanha_id),),
        )
        rows = connection.execute(
            """
            SELECT cj.*, lv.nome AS assembleia_nome, lv.codigo_cne
            FROM casos_juridicos cj
            LEFT JOIN locais_voto lv ON cj.local_voto_id = lv.id
            WHERE cj.campanha_id = %s ORDER BY cj.criado_em DESC
            """,
            (campanha_id,),
        ).fetchall()
    return {"sucesso": True, "total": len(rows), "casos": rows}


def _speech_draft(municipio: str, zone: str, concerns: list[str], settings) -> dict:
    draft = None
    if settings.anthropic_api_key:
        try:
            response = Anthropic(api_key=settings.anthropic_api_key).messages.create(
                model=settings.ai_model,
                max_tokens=1200,
                system=(
                    "Escreva apenas rascunho para revisão humana. Não invente estatísticas, não ataque pessoas "
                    "e prefixe cada compromisso futuro por [PROMESSA — REVISAR]. Retorne JSON com hook_abertura, "
                    "tom_adotado, compromissos_propostas (dor_associada, texto_proposta), bloco_juventude e armadilhas_a_evitar."
                ),
                messages=[{
                    "role": "user",
                    "content": f"Município: {municipio}; classificação histórica: {zone}; dores agregadas: {', '.join(concerns) or 'sem dados de campo'}.",
                }],
            )
            text = "".join(block.text for block in response.content if getattr(block, "type", "") == "text").strip()
            try:
                draft = json.loads(text)
            except json.JSONDecodeError:
                json_match = re.search(r"\{[\s\S]*\}", text)
                if json_match:
                    try:
                        draft = json.loads(json_match.group(0))
                    except json.JSONDecodeError:
                        draft = None
        except Exception as exc:
            logger.warning("Falha ao consultar API Anthropic para discurso: %s", exc)
            draft = None

    if not isinstance(draft, dict):
        draft = {
            "hook_abertura": f"Comunidade de {municipio}, este é um rascunho para revisão do comité.",
            "tom_adotado": "Escuta e foco programático",
            "compromissos_propostas": [
                {"dor_associada": concern, "texto_proposta": f"[PROMESSA — REVISAR] Avaliar opções para {concern} com a comunidade."}
                for concern in concerns[:3]
            ],
            "bloco_juventude": "Validar com dados oficiais antes de publicação.",
            "armadilhas_a_evitar": ["Não afirmar resultados ou estatísticas sem fonte."],
        }
    for item in draft.get("compromissos_propostas", []):
        if not item.get("texto_proposta", "").startswith("[PROMESSA — REVISAR]"):
            item["texto_proposta"] = f"[PROMESSA — REVISAR] {item.get('texto_proposta', '')}".strip()
    return draft


@router.post("/discursos/gerar", status_code=201)
def generate_speech(
    payload: SpeechGenerateRequest,
    request: Request,
    user: Annotated[dict, Depends(ROLE_REVIEW)],
):
    municipality = payload.municipio.strip()
    if not municipality:
        raise HTTPException(status_code=422, detail="municipio é obrigatório.")
    campaign = payload.campanha_id or UUID(user["campaign_id"])
    if str(campaign) != user["campaign_id"]:
        raise HTTPException(status_code=403, detail="A campanha não corresponde ao token autenticado.")
    with request.app.state.db_pool.connection() as connection:
        with connection.transaction():
            connection.execute(
                "SELECT set_config('app.current_campanha_id', %s, true)",
                (str(campaign),),
            )
            territory = connection.execute(
                """
                SELECT municipio, provincia,
                       coalesce(sum(total_eleitores_aptos), 0) AS eleitores,
                       mode() WITHIN GROUP (ORDER BY zonamento_historico) AS zona
                FROM locais_voto WHERE lower(municipio) = lower(%s)
                GROUP BY municipio, provincia
                """,
                (municipality,),
            ).fetchone()
            if not territory:
                raise HTTPException(status_code=404, detail="Município não encontrado nos dados territoriais.")
            concerns = connection.execute(
                """
                SELECT concern AS dor FROM visitas_terreno vt
                JOIN locais_voto lv ON ST_DWithin(vt.localizacao, lv.localizacao, 4000)
                CROSS JOIN LATERAL unnest(vt.dores_prioritarias) AS concern
                WHERE lower(lv.municipio) = lower(%s) AND vt.campanha_id = %s
                GROUP BY concern ORDER BY count(*) DESC LIMIT 3
                """,
                (municipality, campaign),
            ).fetchall()
            draft = _speech_draft(
                municipality, territory["zona"] or "CAMPO_BATALHA",
                [item["dor"] for item in concerns], request.app.state.settings,
            )
            row = connection.execute(
                """
                INSERT INTO discursos_campanha (
                    campanha_id, unidade_territorial_id, modelo_ia_utilizado,
                    hook_abertura, compromissos_propostas, bloco_juventude,
                    armadilhas_evitar, status_aprovacao
                ) VALUES (
                    %s, (SELECT id FROM unidades_territoriais WHERE lower(nome) = lower(%s) LIMIT 1),
                    %s, %s, %s, %s, %s, 'RASCUNHO'
                ) RETURNING id, status_aprovacao, criado_em
                """,
                (
                    campaign, municipality,
                    request.app.state.settings.ai_model if request.app.state.settings.anthropic_api_key else "heuristico_auditado_v1",
                    draft["hook_abertura"], json.dumps(draft["compromissos_propostas"]),
                    draft["bloco_juventude"], json.dumps(draft["armadilhas_a_evitar"]),
                ),
            ).fetchone()
    speech = {
        "id": str(row["id"]),
        "campanha_id": str(campaign),
        "municipio": territory["municipio"],
        "provincia": territory["provincia"],
        "zonamento": territory["zona"],
        "modelo_ia": request.app.state.settings.ai_model if request.app.state.settings.anthropic_api_key else "heuristico_auditado_v1",
        "provedor": "anthropic" if request.app.state.settings.anthropic_api_key else "heuristico",
        "status_aprovacao": "RASCUNHO",
        **draft,
        "criado_em": row["criado_em"],
    }
    return {"sucesso": True, "mensagem": "Rascunho enviado para aprovação humana.", "discurso": speech}


@router.patch("/discursos/{speech_id}/status")
def update_speech_status(
    speech_id: UUID,
    payload: SpeechStatusUpdateRequest,
    request: Request,
    user: Annotated[dict, Depends(ROLE_REVIEW)],
):
    with request.app.state.db_pool.connection() as connection:
        with connection.transaction():
            connection.execute(
                "SELECT set_config('app.current_campanha_id', %s, true)",
                (str(user["campaign_id"]),),
            )
            row = connection.execute(
                """
                UPDATE discursos_campanha
                SET status_aprovacao = %s, responsavel_revisao = %s,
                    comentarios_revisao = %s,
                    aprovado_em = CASE WHEN %s = 'APROVADO' THEN clock_timestamp() ELSE NULL END,
                    atualizado_em = clock_timestamp()
                WHERE id = %s AND campanha_id = %s RETURNING *
                """,
                (
                    payload.status, payload.responsavel_revisao, payload.comentarios_revisao,
                    payload.status, speech_id, user["campaign_id"],
                ),
            ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Discurso não encontrado.")
    return {"sucesso": True, "mensagem": f"Discurso atualizado para {payload.status}.", "discurso": row}


@router.get("/discursos/historico/{municipio}")
def speech_history(municipio: str, request: Request, user: Annotated[dict, Depends(ROLE_REVIEW)]):
    with request.app.state.db_pool.connection() as connection:
        connection.execute(
            "SELECT set_config('app.current_campanha_id', %s, true)",
            (str(user["campaign_id"]),),
        )
        rows = connection.execute(
            """
            SELECT dc.*, ut.nome AS territorio_nome
            FROM discursos_campanha dc JOIN unidades_territoriais ut
              ON dc.unidade_territorial_id = ut.id
            WHERE lower(ut.nome) = lower(%s) AND dc.campanha_id = %s
            ORDER BY dc.criado_em DESC
            """,
            (municipio, user["campaign_id"]),
        ).fetchall()
    return {"sucesso": True, "municipio": municipio, "total": len(rows), "historico": rows}


@router.get("/discurso-territorializado/{municipio}")
def territorial_speech(municipio: str, request: Request, user: Annotated[dict, Depends(ROLE_REVIEW)]):
    with request.app.state.db_pool.connection() as connection:
        connection.execute(
            "SELECT set_config('app.current_campanha_id', %s, true)",
            (str(user["campaign_id"]),),
        )
        territory = connection.execute(
            """
            SELECT lv.municipio, lv.provincia,
                   coalesce(sum(lv.total_eleitores_aptos), 0) AS eleitores,
                   mode() WITHIN GROUP (ORDER BY lv.zonamento_historico) AS zona
            FROM locais_voto lv WHERE lower(lv.municipio) = lower(%s)
            GROUP BY lv.municipio, lv.provincia
            """,
            (municipio,),
        ).fetchone()
    if not territory:
        raise HTTPException(status_code=404, detail="Município não encontrado.")
    draft = _speech_draft(municipio, territory["zona"] or "CAMPO_BATALHA", [], request.app.state.settings)
    return {
        "sucesso": True,
        "municipio": municipio,
        "status_aprovacao": "RASCUNHO",
        "modelo_ia_utilizado": request.app.state.settings.ai_model if request.app.state.settings.anthropic_api_key else "heuristico_auditado_v1",
        "dados_eleitorais": {
            "total_eleitores": territory["eleitores"],
            "zonamento_predominante": territory["zona"],
        },
        "estrategia_discurso": {
            "status": "RASCUNHO",
            "tom": {"classificacao": draft["tom_adotado"], "postura": draft["tom_adotado"]},
            "abertura_hook": draft["hook_abertura"],
            "compromissos_prioritarios": [
                {"dor_identificada": item["dor_associada"], "proposta_chave": item["texto_proposta"], "frase_de_impacto": item["texto_proposta"]}
                for item in draft["compromissos_propostas"]
            ],
            "modulo_juventude": {"mensagem_central": draft["bloco_juventude"], "apelo_final": draft["bloco_juventude"]},
            "armadilhas_a_evitar": draft["armadilhas_a_evitar"],
            "gerado_em": datetime.now(UTC).isoformat(),
        },
    }
