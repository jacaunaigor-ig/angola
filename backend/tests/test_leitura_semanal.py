from datetime import UTC, datetime, timedelta

from app.leitura_semanal import contar_temas, extrair_itens, leitura_valida

XML = """<?xml version="1.0" encoding="UTF-8"?>
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
</channel></rss>""".encode()


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
