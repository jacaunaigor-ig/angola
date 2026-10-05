"""Catálogo e âmbito dos planos comerciais Municipal / Provincial / Nacional."""

from __future__ import annotations

from typing import Any

PLANOS: dict[str, dict[str, Any]] = {
    "MUNICIPAL": {
        "codigo": "MUNICIPAL",
        "nome": "Plano Municipal",
        "tagline": "O War Room de um município — porta-a-porta, dores e discurso local.",
        "publico_alvo": "Candidatos a administrador municipal e coordenadores de circunscrição.",
        "ambito": "MUNICIPIO",
        "limites": {
            "contas_war_room": 5,
            "brigadistas": 40,
            "visitas_mes": 8000,
            "discursos_ia_mes": 15,
            "assembleias_dia_d": 0,
        },
        "funcionalidades": {
            "cartografia": True,
            "porta_a_porta": True,
            "discursos_ia": True,
            "simulador_metas": True,
            "telemetria_dores": True,
            "anomalias_basicas": True,
            "invalidar_lote": False,
            "dia_d": False,
            "casos_juridicos": False,
            "malha_dupla_dpa": False,
            "api_exportacao": False,
            "hq_nacional": False,
        },
        "preco_tabela_aoa": 4_800_000,
        "cor": "#38BDF8",
    },
    "PROVINCIAL": {
        "codigo": "PROVINCIAL",
        "nome": "Plano Provincial",
        "tagline": "Uma província inteira — priorização, Dia D e governação de discursos.",
        "publico_alvo": "Direcções provinciais e listas de deputados.",
        "ambito": "PROVINCIA",
        "limites": {
            "contas_war_room": 20,
            "brigadistas": 250,
            "visitas_mes": 60_000,
            "discursos_ia_mes": 80,
            "assembleias_dia_d": 400,
        },
        "funcionalidades": {
            "cartografia": True,
            "porta_a_porta": True,
            "discursos_ia": True,
            "simulador_metas": True,
            "telemetria_dores": True,
            "anomalias_basicas": True,
            "invalidar_lote": True,
            "dia_d": True,
            "casos_juridicos": True,
            "malha_dupla_dpa": True,
            "api_exportacao": False,
            "hq_nacional": False,
        },
        "preco_tabela_aoa": 18_500_000,
        "cor": "#F97316",
    },
    "NACIONAL": {
        "codigo": "NACIONAL",
        "nome": "Plano Nacional / HQ",
        "tagline": "As 21 províncias num único comando — apuramento nacional e isolamento multi-campanha.",
        "publico_alvo": "Comissões nacionais e quartéis-generais de campanha presidencial.",
        "ambito": "NACIONAL",
        "limites": {
            "contas_war_room": 80,
            "brigadistas": 2000,
            "visitas_mes": 400_000,
            "discursos_ia_mes": 400,
            "assembleias_dia_d": 13_000,
        },
        "funcionalidades": {
            "cartografia": True,
            "porta_a_porta": True,
            "discursos_ia": True,
            "simulador_metas": True,
            "telemetria_dores": True,
            "anomalias_basicas": True,
            "invalidar_lote": True,
            "dia_d": True,
            "casos_juridicos": True,
            "malha_dupla_dpa": True,
            "api_exportacao": True,
            "hq_nacional": True,
        },
        "preco_tabela_aoa": 62_000_000,
        "cor": "#10B981",
    },
}

MUNICIPIOS_VENDAVEIS = [
    {"municipio": "Talatona", "provincia": "Luanda"},
    {"municipio": "Viana", "provincia": "Luanda"},
    {"municipio": "Cacuaco", "provincia": "Luanda"},
    {"municipio": "Luanda", "provincia": "Luanda"},
    {"municipio": "Cazenga", "provincia": "Luanda"},
    {"municipio": "Belas", "provincia": "Luanda"},
    {"municipio": "Huambo", "provincia": "Huambo"},
    {"municipio": "Caála", "provincia": "Huambo"},
    {"municipio": "Lobito", "provincia": "Benguela"},
    {"municipio": "Benguela", "provincia": "Benguela"},
    {"municipio": "Lubango", "provincia": "Huíla"},
    {"municipio": "Cabinda", "provincia": "Cabinda"},
    {"municipio": "Malanje", "provincia": "Malanje"},
    {"municipio": "Uíge", "provincia": "Uíge"},
    {"municipio": "Saurimo", "provincia": "Lunda Sul"},
]


def obter_plano(codigo: str) -> dict[str, Any] | None:
    return PLANOS.get(str(codigo or "").upper())


def formatar_aoa(valor: int) -> str:
    return f"{int(valor):,}".replace(",", ".") + " AOA"


def resolver_circunscricao(territorio: Any) -> dict[str, str | None] | None:
    if territorio is None:
        return None
    if isinstance(territorio, dict):
        return {
            "municipio": territorio.get("municipio"),
            "provincia": territorio.get("provincia") or territorio.get("nome"),
        }
    texto = str(territorio).strip()
    for item in MUNICIPIOS_VENDAVEIS:
        if item["municipio"].casefold() == texto.casefold():
            return item
    return {"municipio": None, "provincia": texto}


def nomes_no_ambito(plano_codigo: str, territorio: Any) -> dict[str, Any]:
    plano = obter_plano(plano_codigo)
    if not plano:
        return {"ok": False, "erro": "Plano desconhecido.", "nomes": []}
    if plano["ambito"] == "NACIONAL":
        return {"ok": True, "nomes": [], "irrestrito": True, "plano": plano}

    circ = resolver_circunscricao(territorio)
    if not circ or not circ.get("provincia"):
        return {"ok": False, "erro": "Indique o território contratado.", "nomes": [], "plano": plano}

    return {
        "ok": True,
        "nomes": [circ["provincia"]],
        "municipio_contratado": circ.get("municipio") or circ["provincia"],
        "provincia_contratada": circ["provincia"],
        "irrestrito": False,
        "plano": plano,
    }


def _norm(valor: Any) -> str:
    return str(valor or "").strip().casefold()


def unidade_no_ambito(props: dict[str, Any], ambito: dict[str, Any]) -> bool:
    if not ambito or ambito.get("irrestrito"):
        return True
    alvos = {_norm(n) for n in ambito.get("nomes") or []}
    candidatos = [props.get("nome"), props.get("provincia"), props.get("municipio")]
    return any(_norm(c) in alvos for c in candidatos if c)


def filtrar_geojson(geo: dict[str, Any] | None, plano_codigo: str, territorio: Any) -> dict[str, Any]:
    ambito = nomes_no_ambito(plano_codigo, territorio)
    if not geo or "features" not in geo:
        return {"type": "FeatureCollection", "features": [], "ambito": ambito}
    if not ambito.get("ok"):
        return {"type": "FeatureCollection", "features": [], "ambito": ambito}
    if ambito.get("irrestrito"):
        return {**geo, "ambito": ambito}
    features = [f for f in geo.get("features") or [] if unidade_no_ambito(f.get("properties") or {}, ambito)]
    return {**geo, "features": features, "ambito": ambito}


def calcular_orcamento(plano_codigo: str, territorio: Any = None, brigadistas: int | None = None) -> dict[str, Any]:
    plano = obter_plano(plano_codigo)
    if not plano:
        return {"ok": False, "erro": "Plano desconhecido."}
    circ = resolver_circunscricao(territorio)
    if plano["ambito"] != "NACIONAL" and not (circ and circ.get("provincia")):
        return {"ok": False, "erro": "O plano exige um território contratado."}
    brig = max(int(brigadistas or plano["limites"]["brigadistas"]), 0)
    return {
        "ok": True,
        "plano": plano["codigo"],
        "territorio": circ,
        "total_aoa": plano["preco_tabela_aoa"],
        "total_formatado": formatar_aoa(plano["preco_tabela_aoa"]),
        "brigadistas": brig,
        "limites": plano["limites"],
        "aviso": "Preço de tabela do ciclo 2027. A proposta formal prevalece.",
    }


def matriz_comparativa() -> list[dict[str, Any]]:
    linhas = []
    campos = [
        ("Âmbito", lambda p: "1 município" if p["ambito"] == "MUNICIPIO" else "1 província" if p["ambito"] == "PROVINCIA" else "21 províncias"),
        ("Contas War Room", lambda p: str(p["limites"]["contas_war_room"])),
        ("Brigadistas", lambda p: str(p["limites"]["brigadistas"])),
        ("Visitas / mês", lambda p: f"{p['limites']['visitas_mes']:,}".replace(",", ".")),
        ("Discursos IA / mês", lambda p: str(p["limites"]["discursos_ia_mes"])),
        ("Porta-a-porta offline", lambda p: "Incluído"),
        ("Dia D / atas", lambda p: "Incluído" if p["funcionalidades"]["dia_d"] else "Upgrade Provincial"),
        ("Casos jurídicos", lambda p: "Incluído" if p["funcionalidades"]["casos_juridicos"] else "Upgrade Provincial"),
        ("Invalidar lote suspeito", lambda p: "Incluído" if p["funcionalidades"]["invalidar_lote"] else "Upgrade Provincial"),
        ("Malha DPA 2016+2024", lambda p: "Incluído" if p["funcionalidades"]["malha_dupla_dpa"] else "Só DPA 2024"),
        ("API / exportação HQ", lambda p: "Incluído" if p["funcionalidades"]["api_exportacao"] else "—"),
        ("Preço de tabela", lambda p: formatar_aoa(p["preco_tabela_aoa"])),
    ]
    for rotulo, fn in campos:
        linha = {"Capacidade": rotulo}
        for plano in PLANOS.values():
            linha[plano["nome"]] = str(fn(plano))
        linhas.append(linha)
    return linhas
