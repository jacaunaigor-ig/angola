"""Testes das regras de anomalia de campo (rajada + Shapely)."""

import unittest
from datetime import datetime, timedelta, timezone

from shapely.geometry import mapping, box

from war_room.anomalias_campo import (
    analisar_integridade_campo,
    detectar_coordenadas_fora_municipio,
    detectar_rajada_formularios,
    carregar_malha_shapely,
)


def _iso(dt):
    return dt.isoformat()


class TestAnomaliasCampo(unittest.TestCase):
    def test_rajada_impossivel(self):
        base = datetime(2026, 9, 30, 10, 0, tzinfo=timezone.utc)
        visitas = [
            {
                "uuid": f"aaaaaaaa-aaaa-4aaa-8aaa-{i:012d}",
                "ativista_id": "ativista-1",
                "registado_em": _iso(base + timedelta(seconds=i * 4)),
                "longitude": 13.26,
                "latitude": -8.91,
            }
            for i in range(52)
        ]
        alertas = detectar_rajada_formularios(visitas, limiar=50, janela_minutos=5)
        self.assertEqual(len(alertas), 1)
        self.assertGreater(alertas[0]["quantidade"], 50)
        self.assertEqual(alertas[0]["tipo"], "RAJADA_IMPOSSIVEL")

    def test_coordenada_fora_do_poligono(self):
        poligono = box(13.0, -9.2, 13.6, -8.6)
        malha = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"nome": "Luanda"},
                    "geometry": mapping(poligono),
                }
            ],
        }
        poligonos = carregar_malha_shapely(malha)
        visitas = [
            {
                "uuid": "bbbbbbbb-bbbb-4bbb-8bbb-000000000001",
                "ativista_id": "ativista-2",
                "municipio": "Luanda",
                "longitude": 0.0,
                "latitude": 0.0,
                "registado_em": _iso(datetime.now(timezone.utc)),
            }
        ]
        alertas = detectar_coordenadas_fora_municipio(visitas, poligonos)
        self.assertEqual(len(alertas), 1)
        self.assertEqual(alertas[0]["tipo"], "FORA_MUNICIPIO")

    def test_ponto_dentro_nao_alerta(self):
        poligono = box(13.0, -9.2, 13.6, -8.6)
        malha = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"nome": "Luanda"},
                    "geometry": mapping(poligono),
                }
            ],
        }
        resultado = analisar_integridade_campo(
            [
                {
                    "uuid": "cccccccc-cccc-4ccc-8ccc-000000000001",
                    "ativista_id": "ativista-3",
                    "municipio": "Luanda",
                    "longitude": 13.26,
                    "latitude": -8.91,
                    "registado_em": _iso(datetime.now(timezone.utc)),
                }
            ],
            geojson_malha=malha,
            limiar=50,
        )
        self.assertEqual(resultado["total_alertas"], 0)


if __name__ == "__main__":
    unittest.main()
