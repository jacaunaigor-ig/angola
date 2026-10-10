"""Contrato de grão: votos OFICIAL só no círculo provincial com acta CNE."""

from pathlib import Path

from app.main import create_app
from app.settings import Settings
from app.territorio import (
    MARCA_FONTE_MUNICIPAL_CNE,
    NIVEIS_SEM_VOTO_CNE,
    fonte_municipal_cne_documentada,
    selo_votos,
    tipo_correspondencia_2024,
)
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
README = (ROOT / "data" / "raw" / "README.md").read_text(encoding="utf-8")


def _client():
    app = create_app(
        Settings(
            app_env="test",
            jwt_secret_key="secret-key-at-least-32-chars-long!",
            cors_allowed_origins="http://localhost:3000",
        ),
        require_database=False,
    )
    return TestClient(app)


def test_readme_nao_autoriza_fonte_municipal_cne():
    assert not any(linha.strip() == MARCA_FONTE_MUNICIPAL_CNE for linha in README.splitlines())
    assert fonte_municipal_cne_documentada(README) is False
    assert "não contém municípios" in README


def test_selo_votos_provincia_2016_oficial_e_2024_residual_ausente():
    cne = {"AO-LUA": {"votos_validos": 1}, "AO-HUA": {"votos_validos": 1}, "AO-MOX": {"votos_validos": 1}}
    de_para = {
        "correspondencias_provincias": [
            {
                "provincia_2016": "Luanda",
                "provincias_2024_resultantes": [
                    {"nome": "Luanda", "tipo": "REMANESCENTE_URBANA"},
                    {"nome": "Icolo e Bengo", "tipo": "NOVA_PROVINCIA"},
                ],
            },
            {
                "provincia_2016": "Huambo",
                "provincias_2024_resultantes": [{"nome": "Huambo", "tipo": "INALTERADA"}],
            },
            {
                "provincia_2016": "Moxico",
                "provincias_2024_resultantes": [
                    {"nome": "Moxico", "tipo": "REMANESCENTE_OESTE"},
                    {"nome": "Moxico Leste", "tipo": "NOVA_PROVINCIA"},
                ],
            },
        ]
    }
    assert (
        selo_votos(
            nivel="provincia",
            versao="DPA_2016_18P",
            nome="Luanda",
            codigo_dpa="AO-LUA",
            cne_por_codigo=cne,
            de_para=de_para,
        )
        == "OFICIAL"
    )
    assert (
        selo_votos(
            nivel="provincia",
            versao="DPA_2024_21P",
            nome="Huambo",
            codigo_dpa="AO-HUA",
            cne_por_codigo=cne,
            de_para=de_para,
        )
        == "OFICIAL"
    )
    assert (
        selo_votos(
            nivel="provincia",
            versao="DPA_2024_21P",
            nome="Luanda",
            codigo_dpa="AO-LUA",
            cne_por_codigo=cne,
            de_para=de_para,
        )
        == "AUSENTE"
    )
    assert (
        selo_votos(
            nivel="provincia",
            versao="DPA_2024_21P",
            nome="Moxico",
            codigo_dpa="AO-MOX",
            cne_por_codigo=cne,
            de_para=de_para,
        )
        == "AUSENTE"
    )
    assert (
        selo_votos(
            nivel="provincia",
            versao="DPA_2024_21P",
            nome="Icolo e Bengo",
            codigo_dpa="AO-ICB",
            cne_por_codigo=cne,
            de_para=de_para,
        )
        == "AUSENTE"
    )
    for nivel in NIVEIS_SEM_VOTO_CNE:
        assert (
            selo_votos(
                nivel=nivel,
                versao="DPA_2016_18P",
                nome="Talatona",
                codigo_dpa="AO-LUA",
                cne_por_codigo=cne,
                de_para=de_para,
            )
            == "AUSENTE"
        )


def test_tipo_correspondencia_nao_confunde_cubango_com_cuando_cubango():
    assert tipo_correspondencia_2024("Huambo") == "INALTERADA"
    assert tipo_correspondencia_2024("Cuando") == "NOVA_PROVINCIA"
    assert tipo_correspondencia_2024("Cubango") == "REMANESCENTE_OESTE"


def test_unidades_2016_oficial_e_2024_nao_copia_acta_para_residual():
    with _client() as client:
        dpa2016 = client.get("/api/territorio/unidades?versao=DPA_2016_18P&formato=geojson")
        assert dpa2016.status_code == 200
        luanda = next(f for f in dpa2016.json()["features"] if f["properties"]["nome"] == "Luanda")
        assert luanda["properties"]["proveniencia_votos"] == "OFICIAL"
        assert luanda["properties"]["proveniencia_dados"] == "OFICIAL"
        assert luanda["properties"]["nivel"] == "provincia"
        assert luanda["properties"]["margem_apurada_perc"] is not None

        dpa2024 = client.get("/api/territorio/unidades?versao=DPA_2024_21P&formato=geojson")
        assert dpa2024.status_code == 200
        assert len(dpa2024.json()["features"]) == 21
        residual = {f["properties"]["nome"]: f["properties"] for f in dpa2024.json()["features"]}
        for nome in ("Luanda", "Moxico", "Cubango", "Cuando", "Icolo e Bengo", "Moxico Leste", "Bengo"):
            props = residual[nome]
            assert props["proveniencia_votos"] == "AUSENTE", nome
            assert props.get("margem_apurada_perc") is None, nome
            assert not props.get("hondt_deputados"), nome
        assert residual["Huambo"]["proveniencia_votos"] == "OFICIAL"
        assert residual["Huambo"]["proveniencia_dados"] == "OFICIAL"
        assert residual["Icolo e Bengo"]["proveniencia_dados"] == "SIMULADO"
        assert residual["Icolo e Bengo"]["proveniencia_geometria"] == "SIMULADO"
        assert residual["Luanda"]["circulo_2016"] == "Luanda"
        assert residual["Luanda"]["provincia"] == "Luanda"


def test_municipio_comuna_bairro_nunca_oficial_sem_fonte_cne():
    with _client() as client:
        mun = client.get("/api/territorio/municipios")
        assert mun.status_code == 200
        corpo = mun.json()
        assert corpo["proveniencia_votos"] == "AUSENTE"
        assert corpo["features"], "catálogo operacional não pode estar vazio"
        assert "CNE não publicou" in (corpo.get("nota") or "") or "nao publicou" in (corpo.get("nota") or "").lower()
        for feat in corpo["features"]:
            props = feat["properties"]
            assert props["nivel"] == "municipio"
            assert props["proveniencia_votos"] == "AUSENTE"
            assert props.get("margem_apurada_perc") is None
            assert props.get("zonamento") is None
            assert "votos_partido_a" not in props

        local = client.get("/api/territorio/local?municipio=Luanda")
        assert local.status_code == 200
        dados = local.json()
        assert dados["proveniencia_votos"] == "AUSENTE"
        assert dados["comunas"]["features"]
        assert dados["bairros"]["features"]
        for feat in [*dados["comunas"]["features"], *dados["bairros"]["features"]]:
            props = feat["properties"]
            assert props["nivel"] in {"comuna", "bairro"}
            assert props["proveniencia_votos"] == "AUSENTE"
            assert props.get("margem_apurada_perc") is None

        vazio = client.get("/api/territorio/local?municipio=MunicipioInexistente")
        assert vazio.status_code == 200
        assert vazio.json()["comunas"]["features"] == []
        assert vazio.json()["proveniencia_votos"] == "AUSENTE"


def test_municipio_nao_herda_margem_provincial_como_oficial():
    with _client() as client:
        talatona = next(
            f for f in client.get("/api/territorio/municipios").json()["features"] if f["properties"]["nome"] == "Talatona"
        )
        props = talatona["properties"]
        assert props["proveniencia_votos"] == "AUSENTE"
        assert props.get("margem_circulo_perc") is not None
        assert props["circulo_2016"] == "Luanda"
        assert props.get("margem_apurada_perc") is None
