"""Motor eleitoral sem base de dados. A fórmula visível tem de ser a que corre."""

from __future__ import annotations

import json
from pathlib import Path

from war_room.custo_logistico import (
    ESCALA_PRODUTO,
    EXPOENTE_CUSTO,
    calcular_indice_prioridade_completo,
    classificar_zona,
)
from war_room.motor_hondt import calcular_hondt, simular_cenario_com_variacao, simular_hondt_provincial

ROOT = Path(__file__).resolve().parents[2]
CNE = json.loads((ROOT / "data" / "raw" / "resultados_eleitorais_cne_2022.json").read_text(encoding="utf-8"))
PROVINCIAS = {item["provincia"]: item for item in CNE["provincias"]}


def _votos(provincia: dict) -> tuple[int, int, int]:
    a = provincia["votos_partido_a"]
    b = provincia["votos_partido_b"]
    outros = max(0, provincia["votos_validos"] - a - b)
    return a, b, outros


def test_hondt_cinco_cadeiras_bate_com_cne_2022():
    for nome, provincia in PROVINCIAS.items():
        a, b, outros = _votos(provincia)
        resultado = simular_hondt_provincial(a, b, outros, "A", "B", assentos_circulo=5)
        publicado = provincia["deputados_distribuicao"]
        assert resultado["assentos"]["A"] == publicado["partido_a"], nome
        assert resultado["assentos"]["B"] == publicado["partido_b"], nome
        assert sum(resultado["assentos"].values()) == 5, nome


def test_hondt_empate_de_quociente_favorece_o_partido_com_menos_votos():
    # 2 cadeiras: 1000/2 = 500 e 500/1 = 500. O partido com menos votos leva o empate.
    resultado = calcular_hondt({"Maior": 1000, "Menor": 500}, total_assentos=2)
    assert resultado["assentos"]["Maior"] == 1
    assert resultado["assentos"]["Menor"] == 1


def test_choque_trinta_por_cento_vira_cadeira_em_huambo():
    huambo = PROVINCIAS["Huambo"]
    a, b, outros = _votos(huambo)
    base = simular_hondt_provincial(a, b, outros, "A", "B")
    assert base["assentos"]["A"] == 3
    assert base["assentos"]["B"] == 2

    choque = simular_cenario_com_variacao(
        {"A": a, "B": b, "Outras Forças": outros},
        variacao_partido_a_perc=-30,
        variacao_partido_b_perc=30,
        nome_partido_a="A",
        nome_partido_b="B",
        assentos=5,
    )
    assert choque["assentos"]["B"] > base["assentos"]["B"]


def test_zonamento_quinze_e_menos_quinze():
    assert classificar_zona(15) == "BASTIAO"
    assert classificar_zona(38.59) == "BASTIAO"
    assert classificar_zona(-15) == "OPOSICAO"
    assert classificar_zona(-29.28) == "OPOSICAO"
    assert classificar_zona(1.65) == "CAMPO_BATALHA"
    assert classificar_zona(14.99) == "CAMPO_BATALHA"
    assert classificar_zona(-14.99) == "CAMPO_BATALHA"
    assert classificar_zona(None) == "CAMPO_BATALHA"

    luanda = PROVINCIAS["Luanda"]
    huambo = PROVINCIAS["Huambo"]
    huila = PROVINCIAS["Huíla"]
    assert classificar_zona(luanda["margem_perc"]) == "OPOSICAO"
    assert classificar_zona(huambo["margem_perc"]) == "CAMPO_BATALHA"
    assert classificar_zona(huila["margem_perc"]) == "BASTIAO"


def test_formula_visivel_e_o_calculo():
    luanda = PROVINCIAS["Luanda"]
    prio = calcular_indice_prioridade_completo(
        luanda["eleitores_registados"],
        luanda["margem_perc"],
        luanda["abstencao_perc"],
        67.0,
        "Luanda",
    )
    potencial = prio["potencial_voto"]
    competitividade = prio["competitividade"]
    custo = prio["custo_logistico"]["fator"]
    recomputado = round((potencial * competitividade) / ESCALA_PRODUTO / (custo ** EXPOENTE_CUSTO), 1)
    assert prio["score_prioridade"] == max(5.0, min(100.0, recomputado))
    assert prio["formula_aplicada"] == (
        f"Score = ({potencial} × {competitividade}) ÷ 100 ÷ {custo}^{EXPOENTE_CUSTO} = {prio['score_prioridade']}"
    )
    assert "0.50" not in prio["formula_aplicada"]
    assert "1.35" not in prio["formula_aplicada"]


def test_sem_abstencao_nem_juventude_nao_inventa_cinquenta_nem_sessenta():
    completo = calcular_indice_prioridade_completo(4652250, -29.28, 48.0, 67.0, "Luanda")
    sem_os_dois = calcular_indice_prioridade_completo(4652250, -29.28, None, None, "Luanda")
    assert sem_os_dois["abstencao_perc"] is None
    assert sem_os_dois["juventude_perc"] is None
    assert "abstencao_perc" in sem_os_dois["componentes_ausentes"]
    assert "juventude_perc" in sem_os_dois["componentes_ausentes"]
    assert sem_os_dois["potencial_voto"] != completo["potencial_voto"]
    assert sem_os_dois["score_prioridade"] != completo["score_prioridade"]
    assert sem_os_dois["proveniencia"] == "ESTIMADO"


def test_zero_de_abstencao_nao_e_lacuna():
    prio = calcular_indice_prioridade_completo(1000, 0.0, 0.0, 0.0, "Luanda")
    assert prio["abstencao_perc"] == 0.0
    assert prio["juventude_perc"] == 0.0
    assert prio["componentes_ausentes"] == []


def test_prioridade_luanda_acima_de_cuando_cubango():
    luanda = PROVINCIAS["Luanda"]
    cuando = PROVINCIAS["Cuando Cubango"]
    prio_luanda = calcular_indice_prioridade_completo(
        luanda["eleitores_registados"], luanda["margem_perc"], luanda["abstencao_perc"], 67.0, "Luanda"
    )
    prio_cuando = calcular_indice_prioridade_completo(
        cuando["eleitores_registados"], cuando["margem_perc"], cuando["abstencao_perc"], 58.0, "Cuando Cubango"
    )
    assert prio_luanda["score_prioridade"] > prio_cuando["score_prioridade"]


def test_motor_nao_lê_manchetes():
    texto = "\n".join(caminho.read_text(encoding="utf-8") for caminho in (ROOT / "war_room").glob("*.py"))
    assert "leitura_semanal" not in texto
    assert "manchetes" not in texto
