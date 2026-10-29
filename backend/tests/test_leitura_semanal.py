from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.leitura_semanal import contar_temas, extrair_itens, leitura_valida, montar_leitura, temas_do_texto

XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<item>
  <title>UNITA fala de emprego jovem em Luanda - Novo Jornal</title>
  <link>https://exemplo.ao/1</link>
  <pubDate>Fri, 09 Oct 2026 10:00:00 GMT</pubDate>
  <source>Novo Jornal</source>
</item>
<item>
  <title>Demolicoes e falta de agua no bairro</title>
  <link>https://exemplo.ao/2</link>
  <pubDate>Fri, 09 Oct 2026 11:00:00 GMT</pubDate>
</item>
</channel></rss>"""


def test_extrai_manchete_e_fonte():
    itens = extrair_itens(XML)
    assert itens[0]["fonte"] == "Novo Jornal"
    assert "emprego jovem" in itens[0]["titulo"]
    assert "EMPREGO" in itens[0]["temas"]
    assert itens[1]["fonte"] == "Imprensa"


def test_conta_temas_sem_inventar_zero():
    temas = {t["id"]: t["manchetes"] for t in contar_temas(extrair_itens(XML))}
    assert temas["EMPREGO"] == 1
    assert temas["AGUA"] == 1
    assert temas["CASA"] == 1
    assert "LUZ" not in temas


def test_leitura_vale_sete_dias():
    agora = datetime(2026, 10, 9, tzinfo=UTC)
    assert leitura_valida((agora - timedelta(days=6)).isoformat(), agora)
    assert not leitura_valida((agora - timedelta(days=8)).isoformat(), agora)


def test_termo_curto_nao_apanha_palavra_maior():
    assert "FUNDO" not in temas_do_texto("O mar está profundo ao largo de Luanda")
    assert "FUNDO" in temas_do_texto("Receitas do petróleo e do fundo soberano")
    assert "PACTO" not in temas_do_texto("Candidato visita uma escola em Luanda")
    assert "PACTO" in temas_do_texto("Congresso discute pacto de alternância")
    assert "LUZ" not in temas_do_texto("Luanda recebe a selecção")


def test_leitura_nao_entra_no_motor_eleitoral():
    raiz = Path(__file__).resolve().parents[2] / "war_room"
    texto = "\n".join(caminho.read_text(encoding="utf-8") for caminho in raiz.glob("*.py"))
    assert "leitura_semanal" not in texto
    assert "manchetes" not in texto


def test_montar_leitura_marca_proveniencia_e_nao_inventa_sem_rede(tmp_path, monkeypatch):
    from app import leitura_semanal as modulo

    monkeypatch.setattr(modulo, "CACHE", tmp_path / "leitura_semanal.json")

    def falha():
        raise OSError("sem rede")

    try:
        montar_leitura(descarregar=falha)
    except RuntimeError as exc:
        assert "Sem leitura guardada" in str(exc)
    else:
        raise AssertionError("sem cache e sem rede devia falhar")
