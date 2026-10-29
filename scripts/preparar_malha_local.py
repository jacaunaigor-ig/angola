"""Prepara malhas de município, comuna e bairro para a sala de comando.

Fontes:
- geoBoundaries ADM2 (municípios) e ADM3 (comunas), licença indicada pela API.
- OpenStreetMap (nós place=suburb|neighbourhood|quarter), ODbL, só onde existem.

Não cria votos. A CNE de 2022 publica o círculo provincial.
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

from shapely.geometry import Point, mapping, shape

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "geo_angola" / "_tmp"
OUT = ROOT / "geo_angola"
ADM1 = OUT / "geoBoundaries-AGO-ADM1_simplified.geojson"
ADM2_URL = (
    "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/"
    "releaseData/gbOpen/AGO/ADM2/geoBoundaries-AGO-ADM2_simplified.geojson"
)
ADM3_URL = (
    "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/"
    "releaseData/gbOpen/AGO/ADM3/geoBoundaries-AGO-ADM3_simplified.geojson"
)


def baixar(url: str, destino: Path) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    if destino.is_file() and destino.stat().st_size > 1000:
        return
    urllib.request.urlretrieve(url, destino)


def carregar(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def geometria_leve(geom, tolerancia: float):
    shp = shape(geom)
    if shp.is_empty:
        return None
    leve = shp.simplify(tolerancia, preserve_topology=True)
    return mapping(leve)


def centro(shp):
    ponto = shp.representative_point()
    return ponto.x, ponto.y


def preparar() -> None:
    baixar(ADM2_URL, TMP / "adm2.geojson")
    baixar(ADM3_URL, TMP / "adm3.geojson")
    adm1 = []
    for feat in carregar(ADM1)["features"]:
        nome = (feat.get("properties") or {}).get("shapeName")
        if not nome or not feat.get("geometry"):
            continue
        adm1.append((nome, shape(feat["geometry"])))

    municipios = []
    for feat in carregar(TMP / "adm2.geojson")["features"]:
        props = feat.get("properties") or {}
        geom = geometria_leve(feat["geometry"], 0.01)
        if not geom:
            continue
        shp = shape(geom)
        x, y = centro(shp)
        provincia = next((nome for nome, poly in adm1 if poly.contains(shp.representative_point())), "")
        municipios.append(
            {
                "type": "Feature",
                "geometry": geom,
                "properties": {
                    "nome": props.get("shapeName"),
                    "codigo": props.get("shapeID"),
                    "provincia": provincia,
                    "nivel": "municipio",
                    "fonte": "geoBoundaries ADM2",
                    "proveniencia_geometria": "OFICIAL",
                    "proveniencia_votos": "AUSENTE",
                },
            }
        )

    indice = [(item["properties"]["nome"], shape(item["geometry"]), item["properties"]["provincia"]) for item in municipios]
    comunas = []
    for feat in carregar(TMP / "adm3.geojson")["features"]:
        props = feat.get("properties") or {}
        geom = geometria_leve(feat["geometry"], 0.008)
        if not geom:
            continue
        shp = shape(geom)
        ponto = shp.representative_point()
        municipio, provincia = "", ""
        for nome, poly, prov in indice:
            if poly.contains(ponto):
                municipio, provincia = nome, prov
                break
        comunas.append(
            {
                "type": "Feature",
                "geometry": geom,
                "properties": {
                    "nome": props.get("shapeName"),
                    "codigo": props.get("shapeID"),
                    "municipio": municipio,
                    "provincia": provincia,
                    "nivel": "comuna",
                    "fonte": "geoBoundaries ADM3",
                    "proveniencia_geometria": "OFICIAL",
                    "proveniencia_votos": "AUSENTE",
                    "nota": "Nesta fonte, distritos urbanos de Luanda (Maianga, Rangel, Viana) vêm como comuna, não como município da DPA.",
                },
            }
        )

    bairros = bairros_osm(indice)
    escrever(OUT / "municipios_geoboundaries.geojson", municipios, "Municípios geoBoundaries ADM2")
    escrever(OUT / "comunas_geoboundaries.geojson", comunas, "Comunas geoBoundaries ADM3")
    escrever(OUT / "bairros_osm.geojson", bairros, "Bairros OpenStreetMap")
    print(f"municipios {len(municipios)} comunas {len(comunas)} bairros {len(bairros)}")


def bairros_osm(indice) -> list:
    consulta = (
        '[out:json][timeout:90];'
        'area["ISO3166-1"="AO"][admin_level=2]->.a;'
        '('
        'node["place"~"suburb|neighbourhood|quarter"](area.a);'
        'way["place"~"suburb|neighbourhood|quarter"](area.a);'
        ');'
        "out tags center;"
    )
    destino = TMP / "bairros_osm.json"
    if not destino.is_file():
        data = urllib.parse.urlencode({"data": consulta}).encode()
        req = urllib.request.Request(
            "https://overpass-api.de/api/interpreter",
            data=data,
            headers={"User-Agent": "gps-eleitoral-angola/1.0"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resposta:
                destino.write_bytes(resposta.read())
        except Exception as exc:
            print("OSM indisponivel:", exc)
            return []
    bruto = json.loads(destino.read_text(encoding="utf-8"))
    saida = []
    vistos = set()
    for el in bruto.get("elements") or []:
        tags = el.get("tags") or {}
        nome = tags.get("name") or tags.get("name:pt")
        if not nome:
            continue
        if "lat" in el and "lon" in el:
            x, y = float(el["lon"]), float(el["lat"])
        elif el.get("center"):
            x, y = float(el["center"]["lon"]), float(el["center"]["lat"])
        else:
            continue
        chave = (nome, round(x, 3), round(y, 3))
        if chave in vistos:
            continue
        vistos.add(chave)
        ponto = Point(x, y)
        municipio, provincia = "", ""
        for nome_mun, poly, prov in indice:
            if poly.contains(ponto):
                municipio, provincia = nome_mun, prov
                break
        saida.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [round(x, 5), round(y, 5)]},
                "properties": {
                    "nome": nome,
                    "municipio": municipio,
                    "provincia": provincia,
                    "nivel": "bairro",
                    "fonte": "OpenStreetMap",
                    "proveniencia_geometria": "OSM",
                    "proveniencia_votos": "AUSENTE",
                },
            }
        )
    return saida


def escrever(path: Path, features: list, nome: str) -> None:
    path.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "name": nome,
                "features": features,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    preparar()
