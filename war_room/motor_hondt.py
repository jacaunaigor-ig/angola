"""Motor de Simulação Eleitoral pelo Método de Hondt (Assembleia Nacional de Angola).

Conforme a Lei Orgânica sobre as Eleições Gerais de Angola (Lei n.º 36/11 e alterações):
- Círculo Nacional: 130 deputados atribuídos pelo Método de Hondt aos votos nacionais.
- Círculos Provinciais: 5 deputados por província atribuídos pelo Método de Hondt
  (18 províncias na DPA 2016 = 90 deputados; 21 na DPA 2024 = 105 deputados).
- Total Assembleia Nacional: 220 deputados (DPA 2016).
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple


def calcular_hondt(
    votos_partidos: Dict[str, int],
    total_assentos: int = 5,
) -> Dict[str, Any]:
    """Aplica o Método de Hondt estrito a uma distribuição de votos.

    Retorna:
    - assentos_por_partido: {partido: assentos}
    - quocientes_ordenados: lista dos quocientes calculados
    - quociente_corte: o menor quociente que ainda obteve assento
    - ultimo_assento_partido: sigla do partido que levou a última cadeira
    - analise_proxima_cadeira: {partido: {'votos_para_ganhar': int, 'margem_seguranca_perder': int}}
    """
    partidos_validos = {p: max(0, int(v)) for p, v in votos_partidos.items() if max(0, int(v)) > 0}
    if not partidos_validos or total_assentos <= 0:
        return {
            "assentos": {p: 0 for p in votos_partidos},
            "total_assentos": total_assentos,
            "quociente_corte": 0.0,
            "ultimo_eleito": None,
            "disputa_proxima_cadeira": {},
            "quocientes_tabela": [],
        }

    # Gera todos os quocientes: votos / divisor para divisor de 1 até total_assentos
    todos_quocientes: List[Tuple[float, str, int, int]] = []  # (quociente, partido, divisor, votos_originais)
    for partido, votos in partidos_validos.items():
        for d in range(1, total_assentos + 1):
            q = votos / d
            todos_quocientes.append((q, partido, d, votos))

    # Ordena quocientes decrescentes.
    # Em caso de empate exato em Angola: favorece o partido com menor total de votos (pluralismo)
    # ou ordem consistente.
    todos_quocientes.sort(key=lambda x: (x[0], -x[3]), reverse=True)

    eleitos = todos_quocientes[:total_assentos]
    quociente_corte = eleitos[-1][0] if eleitos else 0.0
    ultimo_eleito = eleitos[-1][1] if eleitos else None

    # Contagem de assentos atribuídos
    assentos: Dict[str, int] = {p: 0 for p in votos_partidos}
    for _, partido, _, _ in eleitos:
        assentos[partido] = assentos.get(partido, 0) + 1

    # Quem teve o melhor quociente entre os NÃO eleitos?
    nao_eleitos = todos_quocientes[total_assentos:]
    melhor_nao_eleito_q = nao_eleitos[0][0] if nao_eleitos else 0.0

    # Análise de sensibilidade: quantos votos faltam para +1 assento / folga do assento atual
    disputa: Dict[str, Dict[str, Any]] = {}
    votos_totais_validos = sum(partidos_validos.values())

    for partido in votos_partidos:
        votos_atuais = partidos_validos.get(partido, 0)
        assentos_atuais = assentos.get(partido, 0)

        # Para ganhar mais 1 assento (passar a assentos_atuais + 1):
        # o próximo quociente seria votos_necessarios / (assentos_atuais + 1) > quociente_corte
        divisor_alvo = assentos_atuais + 1
        # Necessita superar o quociente de corte (ou melhor_nao_eleito se o corte já for dele)
        alvo_q = quociente_corte
        # Se o próprio partido detém o último assento eleito, ele compete contra o melhor de fora:
        if partido == ultimo_eleito and len(eleitos) >= 2:
            # Precisa de quociente acima do concorrente de fora para expandir
            alvo_q = max(melhor_nao_eleito_q, quociente_corte)

        votos_necessarios = math.floor(alvo_q * divisor_alvo) + 1
        votos_faltantes = max(0, votos_necessarios - votos_atuais)
        esforco_perc_validos = (
            round((votos_faltantes / votos_totais_validos) * 100, 2)
            if votos_totais_validos > 0
            else 0.0
        )

        # Margem de segurança (quantos votos pode perder antes de perder 1 cadeira):
        if assentos_atuais > 0:
            # O quociente que lhe garantiu o assento atual foi votos / assentos_atuais
            # Ele perderia se caísse abaixo do melhor_nao_eleito_q
            votos_minimos_manter = math.ceil(melhor_nao_eleito_q * assentos_atuais)
            folga_votos = max(0, votos_atuais - votos_minimos_manter)
        else:
            folga_votos = 0

        disputa[partido] = {
            "assentos": assentos_atuais,
            "proximo_divisor": divisor_alvo,
            "votos_para_proximo_assento": votos_faltantes,
            "esforco_perc_validos": esforco_perc_validos,
            "folga_votos_manter_ultimo": folga_votos,
            "volatilidade_cadeira": "ALTA" if esforco_perc_validos <= 3.0 else ("MEDIA" if esforco_perc_validos <= 8.0 else "BAIXA"),
        }

    return {
        "assentos": assentos,
        "total_assentos": total_assentos,
        "quociente_corte": round(quociente_corte, 2),
        "ultimo_eleito": ultimo_eleito,
        "melhor_quociente_excluido": round(melhor_nao_eleito_q, 2),
        "disputa_proxima_cadeira": disputa,
        "votos_totais_validos": votos_totais_validos,
    }


def simular_hondt_provincial(
    votos_partido_a: int,
    votos_partido_b: int,
    votos_outros: int = 0,
    nome_partido_a: str = "Nosso Partido",
    nome_partido_b: str = "Oposição",
    assentos_circulo: int = 5,
) -> Dict[str, Any]:
    """Helper prático para os 5 deputados de um círculo provincial angolano."""
    votos = {
        nome_partido_a: max(0, int(votos_partido_a)),
        nome_partido_b: max(0, int(votos_partido_b)),
    }
    if votos_outros > 0:
        votos["Outras Forças"] = max(0, int(votos_outros))

    resultado = calcular_hondt(votos, total_assentos=assentos_circulo)
    return {
        **resultado,
        "circulo_tipo": "PROVINCIAL",
        "assentos_circulo": assentos_circulo,
        "resumo_verbal": (
            f"{nome_partido_a} elege {resultado['assentos'].get(nome_partido_a, 0)} deputados; "
            f"{nome_partido_b} elege {resultado['assentos'].get(nome_partido_b, 0)} deputados. "
            f"Faltam {resultado['disputa_proxima_cadeira'].get(nome_partido_a, {}).get('votos_para_proximo_assento', 0):,} "
            f"votos para {nome_partido_a} virar a próxima cadeira."
        ),
    }


def simular_cenario_com_variacao(
    votos_base: Dict[str, int],
    variacao_partido_a_perc: float = 0.0,
    variacao_partido_b_perc: float = 0.0,
    nome_partido_a: str = "Nosso Partido",
    nome_partido_b: str = "Oposição",
    assentos: int = 5,
) -> Dict[str, Any]:
    """Simula um cenário prospectivo aplicando choque de votação (ex: +5% comparecimento ou migração)."""
    votos_modificados = dict(votos_base)
    if nome_partido_a in votos_modificados:
        votos_modificados[nome_partido_a] = int(votos_modificados[nome_partido_a] * (1.0 + variacao_partido_a_perc / 100.0))
    if nome_partido_b in votos_modificados:
        votos_modificados[nome_partido_b] = int(votos_modificados[nome_partido_b] * (1.0 + variacao_partido_b_perc / 100.0))

    return calcular_hondt(votos_modificados, total_assentos=assentos)
