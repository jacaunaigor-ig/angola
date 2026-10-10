"""Matriz de Custo Logístico de Alcance e Índice Integrado de Prioridade Territorial.

Fórmula política (a mesma que a sala mostra):
    Score = (Potencial × Competitividade) ÷ 100 ÷ custo^0,65
    Limitado a [5, 100]. Sem abstenção ou juventude, esses termos saem da conta.

Fundamentação de Ciência Política e Logística Eleitoral de Angola:
- A dispersão geográfica e a precariedade das vias terrestres (ex: Quando Cubango, Moxico, Leste)
  tornam o custo por eleitor alcançado até 5 vezes maior do que em Luanda ou Benguela.
- Gastar o orçamento de campanha em províncias de alto custo e baixa volatilidade de deputados
  é um erro estratégico clássico.
"""

from __future__ import annotations

import math
import unicodedata
from typing import Any

PESO_VOLUME = 0.55
PESO_ABSTENCAO = 0.25
PESO_JUVENTUDE = 0.20
EXPOENTE_CUSTO = 0.65
ESCALA_PRODUTO = 100.0
SCORE_MINIMO = 5.0
SCORE_MAXIMO = 100.0


def _normalizar(texto: str) -> str:
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(texto))
    sem_acento = "".join(c for c in nfkd if not unicodedata.combining(c))
    return sem_acento.strip().lower()


# Matriz de Custo Logístico de Alcance Territorial (1.0 = baseline Luanda)
# Fatores ponderados: Distância do hub Luanda, malha rodoviária asfaltada (vs terra/areia),
# disponibilidade de combustível/alojamento, relevo e necessidade de transporte aéreo/fluvial.
MATRIZ_CUSTO_LOGISTICO_PROVINCIAL: dict[str, dict[str, Any]] = {
    "luanda": {
        "fator_custo": 1.00,
        "dificuldade_acesso": "BAIXA",
        "modal_predominante": "Rodoviário Urbano",
        "descricao": "Hub central, alta densidade e malha rodoviária metropolitana.",
    },
    "icolo e bengo": {
        "fator_custo": 1.15,
        "dificuldade_acesso": "BAIXA",
        "modal_predominante": "Rodoviário Urbano/Rural",
        "descricao": "Periferia metropolitana de Luanda (DPA 2024), acesso direto pela EN230.",
    },
    "bengo": {
        "fator_custo": 1.25,
        "dificuldade_acesso": "BAIXA",
        "modal_predominante": "Rodoviário Asfaltado",
        "descricao": "Caxito, proximidade com a capital, tráfego regular.",
    },
    "benguela": {
        "fator_custo": 1.40,
        "dificuldade_acesso": "BAIXA_MEDIA",
        "modal_predominante": "Rodoviário / Aéreo (Catumbela)",
        "descricao": "Corredor litoral desenvolvido (Lobito/Benguela), boa infraestrutura.",
    },
    "cuanza norte": {
        "fator_custo": 1.45,
        "dificuldade_acesso": "MEDIA",
        "modal_predominante": "Rodoviário (EN230)",
        "descricao": "Ndalatando, relevo montanhoso no norte, via pavimentada principal.",
    },
    "cuanza sul": {
        "fator_custo": 1.55,
        "dificuldade_acesso": "MEDIA",
        "modal_predominante": "Rodoviário (EN100)",
        "descricao": "Sumbe/Porto Amboim, extensão territorial ampla e relevo acidentado.",
    },
    "huambo": {
        "fator_custo": 1.65,
        "dificuldade_acesso": "MEDIA",
        "modal_predominante": "Rodoviário / Aéreo (Albano Machado)",
        "descricao": "Planalto central, estradas troncais de ligação, alta densidade rural.",
    },
    "huila": {
        "fator_custo": 1.80,
        "dificuldade_acesso": "MEDIA",
        "modal_predominante": "Rodoviário / Aéreo (Mukanka)",
        "descricao": "Lubango e municípios satélites, distâncias consideráveis do centro.",
    },
    "malanje": {
        "fator_custo": 1.90,
        "dificuldade_acesso": "MEDIA",
        "modal_predominante": "Rodoviário",
        "descricao": "Corredor leste de acesso relativamente plano, estradas secundárias em terra.",
    },
    "namibe": {
        "fator_custo": 2.15,
        "dificuldade_acesso": "MEDIA_ALTA",
        "modal_predominante": "Rodoviário / Ferroviário (CFB)",
        "descricao": "Litoral desértico no sul, longa distância rodoviária da capital.",
    },
    "uige": {
        "fator_custo": 2.20,
        "dificuldade_acesso": "MEDIA_ALTA",
        "modal_predominante": "Rodoviário",
        "descricao": "Norte denso, relevo montanhoso e estradas municipais castigadas pelas chuvas.",
    },
    "zaire": {
        "fator_custo": 2.30,
        "dificuldade_acesso": "MEDIA_ALTA",
        "modal_predominante": "Rodoviário / Marítimo",
        "descricao": "Mbanza Kongo e Soyo, vias com troços degradados e bacias fluviais.",
    },
    "bie": {
        "fator_custo": 2.45,
        "dificuldade_acesso": "MEDIA_ALTA",
        "modal_predominante": "Rodoviário",
        "descricao": "Cuito, centro-leste, estradas secundárias com pontes provisórias.",
    },
    "cabinda": {
        "fator_custo": 3.10,
        "dificuldade_acesso": "ALTA",
        "modal_predominante": "Aéreo Obrigatório / Marítimo",
        "descricao": "Enclave ao norte separado geograficamente por RDC; requer frete aéreo.",
    },
    "cunene": {
        "fator_custo": 3.25,
        "dificuldade_acesso": "ALTA",
        "modal_predominante": "Rodoviário Distante",
        "descricao": "Extremo sul fronteiriço, dispersão pastoral e áreas de seca severa.",
    },
    "lunda sul": {
        "fator_custo": 3.60,
        "dificuldade_acesso": "ALTA",
        "modal_predominante": "Rodoviário Precário / Aéreo",
        "descricao": "Saurimo, mais de 1.000 km de Luanda, custos elevados de combustível.",
    },
    "lunda norte": {
        "fator_custo": 3.75,
        "dificuldade_acesso": "ALTA",
        "modal_predominante": "Rodoviário Precário / Aéreo",
        "descricao": "Dundo e áreas diamantíferas do nordeste, isolamento terrestre acentuado.",
    },
    "moxico": {
        "fator_custo": 3.90,
        "dificuldade_acesso": "ALTA",
        "modal_predominante": "Rodoviário / Ferrovia / Aéreo",
        "descricao": "Maior extensão territorial do país, picadas de areia no interior.",
    },
    "cuando cubango": {
        "fator_custo": 4.40,
        "dificuldade_acesso": "CRITICA",
        "modal_predominante": "Rodoviário Tracção 4x4",
        "descricao": "Sudeste de difícil trânsito ('Terras do Fim do Mundo'), trilhos de areia densa.",
    },
    "moxico leste": {
        "fator_custo": 4.80,
        "dificuldade_acesso": "CRITICA",
        "modal_predominante": "Aéreo / Tracção 4x4",
        "descricao": "Cazombo/Alto Zambeze (DPA 2024), isolamento extremo na fronteira oriental.",
    },
    "cuando": {
        "fator_custo": 4.90,
        "dificuldade_acesso": "CRITICA",
        "modal_predominante": "Tracção 4x4 / Picadas",
        "descricao": "Mavinga/Rivungo/Dirico (DPA 2024), acesso rodoviário severamente limitado.",
    },
}


def obter_custo_logistico(nome_ou_codigo: str) -> dict[str, Any]:
    """Retorna os dados de custo logístico por nome ou código de província."""
    chave = _normalizar(nome_ou_codigo)
    # Tenta casamento exato
    if chave in MATRIZ_CUSTO_LOGISTICO_PROVINCIAL:
        return {**MATRIZ_CUSTO_LOGISTICO_PROVINCIAL[chave], "mapeado": True}
    for prov, dados in MATRIZ_CUSTO_LOGISTICO_PROVINCIAL.items():
        if prov in chave or chave in prov:
            return {**dados, "mapeado": True}
    return {
        "fator_custo": 2.50,
        "dificuldade_acesso": "MEDIA",
        "modal_predominante": "Rodoviário",
        "descricao": "Estimativa logística padrão para território não mapeado individualmente.",
        "mapeado": False,
    }


def classificar_zona(margem_perc: float | None, bastiao: float = 15.0, oposicao: float = -15.0) -> str:
    """Zonamento por margem: ≥ 15 bastião, ≤ −15 oposição, o resto disputa."""
    margem = _numero(margem_perc)
    if margem is None:
        return "CAMPO_BATALHA"
    if margem >= bastiao:
        return "BASTIAO"
    if margem <= oposicao:
        return "OPOSICAO"
    return "CAMPO_BATALHA"


def _numero(valor: Any) -> float | None:
    if valor is None:
        return None
    try:
        n = float(valor)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(n):
        return None
    return n


def _potencial(vol_score: float, abstencao: float | None, juventude: float | None) -> tuple[float, list[str]]:
    partes: list[tuple[float, float]] = [(vol_score, PESO_VOLUME)]
    ausentes: list[str] = []
    if abstencao is None:
        ausentes.append("abstencao_perc")
    else:
        partes.append((abstencao, PESO_ABSTENCAO))
    if juventude is None:
        ausentes.append("juventude_perc")
    else:
        partes.append((juventude, PESO_JUVENTUDE))
    peso = sum(peso for _valor, peso in partes)
    return sum(valor * peso for valor, peso in partes) / peso, ausentes


def calcular_indice_prioridade_completo(
    eleitores_aptos: int,
    margem_apurada_perc: float,
    abstencao_perc: float | None,
    juventude_perc: float | None,
    nome_territorio: str,
    votos_para_virar_cadeira: int | None = None,
    max_eleitores_referencia: int = 4_652_250,
) -> dict[str, Any]:
    """Prioridade: (potencial × competitividade) ÷ 100 ÷ custo^0,65.

    Abstenção ou juventude em falta não são preenchidas. Saem da conta e o selo baixa.
    """
    info_logistica = obter_custo_logistico(nome_territorio)
    fator_custo = float(info_logistica.get("fator_custo", 2.0))

    eleitores = max(0, int(eleitores_aptos or 0))
    vol_score = (eleitores / max(max_eleitores_referencia, 1)) * 100.0
    abst = _numero(abstencao_perc)
    jov = _numero(juventude_perc)
    potencial_voto, ausentes = _potencial(vol_score, abst, jov)

    margem = _numero(margem_apurada_perc)
    if margem is None:
        ausentes.append("margem_apurada_perc")
        competitividade = None
        score_final = None
        formula = "Sem margem publicada. Não há score. Não se inventa competitividade."
    else:
        margem_abs = abs(margem)
        comp_margem = max(5.0, 100.0 - (margem_abs * 2.2))
        if votos_para_virar_cadeira is not None and eleitores > 0:
            esforco_relativo = (votos_para_virar_cadeira / eleitores) * 100.0
            bonus_hondt = max(0.0, 30.0 - (esforco_relativo * 10.0))
            competitividade = min(100.0, comp_margem * 0.75 + bonus_hondt)
        else:
            competitividade = comp_margem

        potencial_r = round(potencial_voto, 1)
        comp_r = round(competitividade, 1)
        score_bruto = (potencial_r * comp_r) / ESCALA_PRODUTO / (fator_custo ** EXPOENTE_CUSTO)
        score_final = max(SCORE_MINIMO, min(SCORE_MAXIMO, round(score_bruto, 1)))
        formula = (
            f"Score = ({potencial_r} × {comp_r}) ÷ {int(ESCALA_PRODUTO)} ÷ "
            f"{fator_custo}^{EXPOENTE_CUSTO} = {score_final}"
        )

    return {
        "score_prioridade": score_final,
        "potencial_voto": None if potencial_voto is None else round(potencial_voto, 1),
        "competitividade": None if competitividade is None else round(competitividade, 1),
        "abstencao_perc": abst,
        "juventude_perc": jov,
        "componentes_ausentes": ausentes,
        "proveniencia": "ESTIMADO",
        "custo_logistico": {
            "fator": fator_custo,
            "dificuldade": info_logistica["dificuldade_acesso"],
            "modal": info_logistica["modal_predominante"],
            "descricao": info_logistica["descricao"],
        },
        "formula_aplicada": formula,
    }
