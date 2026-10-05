import unittest

from war_room.planos_comerciais import (
    calcular_orcamento,
    filtrar_geojson,
    matriz_comparativa,
    obter_plano,
)


class TestPlanosComerciais(unittest.TestCase):
    def test_tres_skus(self):
        self.assertIsNotNone(obter_plano("MUNICIPAL"))
        self.assertIsNotNone(obter_plano("PROVINCIAL"))
        self.assertIsNotNone(obter_plano("NACIONAL"))
        self.assertFalse(obter_plano("MUNICIPAL")["funcionalidades"]["dia_d"])
        self.assertTrue(obter_plano("PROVINCIAL")["funcionalidades"]["dia_d"])

    def test_filtro_municipal(self):
        geo = {
            "type": "FeatureCollection",
            "features": [
                {"type": "Feature", "properties": {"nome": "Luanda"}, "geometry": None},
                {"type": "Feature", "properties": {"nome": "Huambo"}, "geometry": None},
            ],
        }
        filtrado = filtrar_geojson(geo, "MUNICIPAL", "Talatona")
        self.assertEqual(len(filtrado["features"]), 1)
        self.assertEqual(filtrado["features"][0]["properties"]["nome"], "Luanda")

    def test_orcamento_exige_territorio(self):
        self.assertFalse(calcular_orcamento("PROVINCIAL").get("ok"))
        ok = calcular_orcamento("PROVINCIAL", "Huambo")
        self.assertTrue(ok["ok"])
        self.assertEqual(ok["total_aoa"], 18_500_000)

    def test_matriz(self):
        linhas = matriz_comparativa()
        self.assertGreaterEqual(len(linhas), 8)
        self.assertIn("Plano Municipal", linhas[0])


if __name__ == "__main__":
    unittest.main()
