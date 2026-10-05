"""Matriz de Custo Logístico de Alcance e Índice Integrado de Prioridade Territorial.

Fórmula política:
    Score de Prioridade = (Potencial de Voto × Competitividade Eleitoral) / Custo Logístico de Alcance
    Normalizado para escala 0 a 100.

Fundamentação de Ciência Política e Logística Eleitoral de Angola:
- A dispersão geográfica e a precariedade das vias terrestres (ex: Quando Cubango, Moxico, Leste)
  tornam o custo por eleitor alcançado até 5 vezes maior do que em Luanda ou Benguela.
- Gastar o orçamento de campanha em províncias de alto custo e baixa volatilidade de deputados
  é um erro estratégico clássico.
"""

from __future__ import annotations

import unicodedata
from typing import Any, Dict, Optional


def _normalizar(texto: str) -> str:
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(texto))
    sem_acento = "".join(c for c in nfkd if not unicodedata.combining(c))
    return sem_acento.strip().lower()


# Matriz de Custo Logístico de Alcance Territorial (1.0 = baseline Luanda)
# Fatores ponderados: Distância do hub Luanda, malha rodoviária asfaltada (vs terra/areia),
# disponibilidade de combustível/alojamento, relevo e necessidade de transporte aéreo/fluvial.
MATRIZ_CUSTO_LOGISTICO_PROVINCIAL: Dict[str, Dict[str, Any]] = {
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


def obter_custo_logistico(nome_ou_codigo: str) -> Dict[str, Any]:
    """Retorna os dados de custo logístico por nome ou código de província."""
    chave = _normalizar(nome_ou_codigo)
    # Tenta casamento exato
    if chave in MATRIZ_CUSTO_LOGISTICO_PROVINCIAL:
        return MATRIZ_CUSTO_LOGISTICO_PROVINCIAL[chave]
    # Tenta substring (ex: 'provincia do huambo')
    for prov, dados in MATRIZ_CUSTO_LOGISTICO_PROVINCIAL.items():
        if prov in chave or chave in prov:
            return dados
    # Default razoável para territórios desconhecidos
    return {
        "fator_custo": 2.50,
        "dificuldade_acesso": "MEDIA",
        "modal_predominante": "Rodoviário",
        "descricao": "Estimativa logística padrão para território não mapeado individualmente.",
    }


def calcular_indice_prioridade_completo(
    eleitores_aptos: int,
    margem_apurada_perc: float,
    abstencao_perc: float,
    juventude_perc: float,
    nome_territorio: str,
    votos_para_virar_cadeira: Optional[int] = None,
    max_eleitores_referencia: int = 4_652_250,  # Luanda 2022
) -> Dict[str, Any]:
    """Calcula o índice de prioridade combinando:

    1. Potencial de Voto: Volume de eleitores ajustado pelo reservatório (abstenção) e juventude
    2. Competitividade: Margem estreita + volatilidade de Hondt
    3. Custo Logístico de Alcance: Redutor baseado na matriz de infraestrutura
    """
    info_logistica = obter_custo_logistico(nome_territorio)
    fator_custo = float(info_logistica.get("fator_custo", 2.0))

    # 1. Potencial Bruto de Voto (0-100)
    # Pondera o volume de eleitores e o tamanho do reservatório não votante
    eleitores = max(0, int(eleitores_aptos or 0))
    vol_score = (eleitores / max(max_eleitores_referencia, 1)) * 100.0
    abst = float(abstencao_perc or 50.0)
    jov = float(juventude_perc or 60.0)

    # IAR (Índice de Ativação do Reservatório):
    # províncias com alta abstenção e juventude têm mais votos virgens a serem ativados
    potencial_voto = vol_score * 0.55 + (abst * 0.25) + (jov * 0.20)

    # 2. Competitividade Eleitoral (0-100)
    margem_abs = abs(float(margem_apurada_perc or 0.0))
    # Margem < 5% = competitividade altíssima (~90-100)
    # Margem > 40% = competitividade residual (~10-20)
    comp_margem = max(5.0, 100.0 - (margem_abs * 2.2))

    # Se tivermos cálculo de Hondt (votos_para_virar_cadeira):
    if votos_para_virar_cadeira is not None and eleitores > 0:
        esforco_relativo = (votos_para_virar_cadeira / eleitores) * 100.0
        # Se precisa de menos de 1% dos eleitores para virar deputado, bônus de competitividade
        bonus_hondt = max(0.0, 30.0 - (esforco_relativo * 10.0))
        competitividade = min(100.0, comp_margem * 0.75 + bonus_hondt)
    else:
        competitividade = comp_margem

    # 3. Índice Integrado: (Potencial × Competitividade) / Custo Logístico
    # Normalização para escala 0 a 100
    # O divisor fator_custo penaliza territórios caros de alcançar
    numerador = (potencial_voto * 0.50) + (competitividade * 0.50)
    # Fator de escala empírico para manter pontuações no intervalo [5, 100]
    score_bruto = (numerador / (fator_custo ** 0.65)) * 1.35
    score_final = max(5.0, min(100.0, round(score_bruto, 1)))

    return {
        "score_prioridade": score_final,
        "potencial_voto": round(potencial_voto, 1),
        "competitividade": round(competitividade, 1),
        "custo_logistico": {
            "fator": fator_custo,
            "dificuldade": info_logistica["dificuldade_acesso"],
            "modal": info_logistica["modal_predominante"],
            "descricao": info_logistica["descricao"],
        },
        "formula_aplicada": f"Score = ({round(potencial_voto,1)} [Potencial] × {round(competitividade,1)} [Comp]) ÷ {fator_custo}^0.65 [Logística] = {score_final}",
    }
