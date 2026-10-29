"""A base nova aplica cada SQL uma vez, por ordem crescente e sem prefixos repetidos."""

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ESPERADA = [
    "01_schema_postgis.sql",
    "02_seed_angola_data.sql",
    "03_seed_municipios_angola.sql",
    "04_carga_territorial_oficial.sql",
    "05_evidencias.sql",
    "06_usuarios.sql",
    "07_auditoria.sql",
    "08_planos_comerciais.sql",
    "09_rls.sql",
    "10_ed25519.sql",
    "11_queixas.sql",
]


class OrdemMigracoesTest(unittest.TestCase):
    def test_ficheiros_tem_prefixo_unico_e_crescente(self):
        ficheiros = sorted(p.name for p in (ROOT / "database").glob("*.sql"))
        self.assertEqual(ficheiros, ESPERADA)
        prefixos = [nome.split("_", 1)[0] for nome in ficheiros]
        self.assertEqual(prefixos, sorted(prefixos))
        self.assertEqual(len(prefixos), len(set(prefixos)))

    def test_compose_monta_a_mesma_ordem_no_initdb(self):
        texto = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
        montagens = re.findall(
            r"\./database/([^:\s]+):/docker-entrypoint-initdb\.d/([^:\s]+):ro",
            texto,
        )
        origens = [origem for origem, _destino in montagens]
        destinos = [destino for _origem, destino in montagens]
        self.assertEqual(origens, ESPERADA)
        self.assertEqual(destinos, ESPERADA)
        self.assertEqual(destinos, sorted(destinos))
        self.assertEqual(len(destinos), len(set(destinos)))


if __name__ == "__main__":
    unittest.main()
