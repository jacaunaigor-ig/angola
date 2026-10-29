# Atribuições cartográficas e de dados

Este produto mistura código próprio com dados de terceiros. A licença do
software (`LICENSE`) **não** substitui as obrigações abaixo.

## geoBoundaries (malha administrativa de Angola)

Os ficheiros em `geo_angola/` (incluindo `geoBoundaries-AGO-ADM1*`, `municipios_geoboundaries.geojson`, `comunas_geoboundaries.geojson` e derivados) provêm do projecto [geoBoundaries](https://www.geoboundaries.org/).

- Licença do produto de dados: **Creative Commons Attribution 4.0 International (CC BY 4.0)**. O recorte ADM2/ADM3 usado aqui vem marcado como domínio público na API geoBoundaries (fonte Wikimedia Commons / geoBoundaries), build `9469f09`.
- Municípios: 158 (ADM2). Comunas: 558 (ADM3). Não é a lista da DPA 2024.
- Citação obrigatória:

  Runfola, D. et al. (2020). geoBoundaries: A global database of political
  administrative boundaries. *PLoS ONE* 15(4): e0231866.
  https://doi.org/10.1371/journal.pone.0231866

- Termo a incluir em interfaces e relatórios que mostrem a malha:
  «Limites administrativos: geoBoundaries (CC BY 4.0) — https://www.geoboundaries.org/»

O texto original está em `geo_angola/CITATION-AND-USE-geoBoundaries.txt`.

## OpenStreetMap

O mapa de fundo da sala de comando usa mosaicos **OpenStreetMap**.

- Dados: © colaboradores do OpenStreetMap
- Licença da base de dados: **ODbL 1.0** — https://opendatacommons.org/licenses/odbl/
- Atribuição exigida pelo Leaflet/OSM já aparece no canto do mapa.

A malha vetorial de províncias, municípios e comunas **não** é copiada da API do OSM. Os bairros em `geo_angola/bairros_osm.geojson` são pontos `place=suburb|neighbourhood|quarter` obtidos do Overpass, licenciados em **ODbL**. O fundo de ruas é servido pelos mosaicos públicos.

## Fontes oficiais angolanas

Resultados eleitorais e séries históricas: **Comissão Nacional Eleitoral (CNE)**.
Projecções populacionais: **Instituto Nacional de Estatística (INE)**.
A plataforma não republica cadernos eleitorais nem microdados nominais.
