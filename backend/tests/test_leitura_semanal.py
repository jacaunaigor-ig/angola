from datetime import UTC, datetime, timedelta
from email.utils import format_datetime
from pathlib import Path

from app.leitura_semanal import contar_temas, extrair_itens, leitura_valida, montar_leitura, temas_do_texto
from app.routers.leitura import router

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


AGORA = datetime(2026, 10, 9, 12, tzinfo=UTC)


def test_endpoint_diario_e_alias_semanal_compatível():
    caminhos = {rota.path for rota in router.routes}
    assert "/api/leitura-diaria" in caminhos
    assert "/api/leitura-semanal" in caminhos


def test_extrai_manchete_e_fonte():
    itens = extrair_itens(XML, agora=AGORA)
    emprego = next(item for item in itens if "emprego jovem" in item["titulo"])
    agua = next(item for item in itens if "Demolicoes" in item["titulo"])
    assert emprego["fonte"] == "Novo Jornal"
    assert "EMPREGO" in emprego["temas"]
    assert agua["fonte"] == "Imprensa"


def test_conta_temas_sem_inventar_zero():
    temas = {t["id"]: t["manchetes"] for t in contar_temas(extrair_itens(XML, agora=AGORA))}
    assert temas["EMPREGO"] == 1
    assert temas["AGUA"] == 1
    assert temas["CASA"] == 1
    assert "LUZ" not in temas


def test_leitura_vale_24_horas():
    agora = datetime(2026, 10, 9, tzinfo=UTC)
    assert leitura_valida((agora - timedelta(hours=23)).isoformat(), agora)
    assert not leitura_valida((agora - timedelta(hours=25)).isoformat(), agora)
    assert not leitura_valida((agora + timedelta(minutes=1)).isoformat(), agora)


def test_extrai_apenas_manchetes_das_ultimas_24_horas_e_ordena_por_data():
    ontem = format_datetime(AGORA - timedelta(hours=23))
    hoje = format_datetime(AGORA - timedelta(minutes=10))
    xml = f"""<rss><channel>
      <item><title>Mais recente sobre emprego</title><link>https://exemplo.ao/hoje</link><pubDate>{hoje}</pubDate></item>
      <item><title>Antiga sobre água</title><link>https://exemplo.ao/antiga</link><pubDate>{format_datetime(AGORA - timedelta(days=2))}</pubDate></item>
      <item><title>Ontem sobre luz</title><link>https://exemplo.ao/ontem</link><pubDate>{ontem}</pubDate></item>
      <item><title>Sem data verificável</title><link>https://exemplo.ao/sem-data</link></item>
    </channel></rss>""".encode()

    itens = extrair_itens(xml, agora=AGORA)

    assert [item["titulo"] for item in itens] == [
        "Mais recente sobre emprego",
        "Ontem sobre luz",
    ]
    assert all(item["publicada_em"] for item in itens)


def test_montar_leitura_expoe_janela_diaria_e_total(tmp_path, monkeypatch):
    from app import leitura_semanal as modulo

    monkeypatch.setattr(modulo, "CACHE", tmp_path / "leitura_diaria.json")
    publicada = format_datetime(datetime.now(UTC) - timedelta(minutes=5))
    xml = f"""<rss><channel>
      <item><title>Debate sobre emprego jovem</title><link>https://exemplo.ao/hoje</link><pubDate>{publicada}</pubDate></item>
    </channel></rss>""".encode()

    leitura = montar_leitura(descarregar=lambda: xml)

    assert leitura["dias"] == 1
    assert leitura["janela_horas"] == 24
    assert leitura["total_manchetes"] == 1
    assert leitura["manchetes"][0]["publicada_em"]


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
