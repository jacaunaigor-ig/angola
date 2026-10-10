# Dicionário de Dados Brutos e Proveniência (data/raw/)

Este diretório contém os conjuntos de dados brutos que alimentam o pipeline ETL (`scripts/etl_territorial.js`) da plataforma **GPS de Marketing Político — Angola 2027**.

Em estrita conformidade com o **Princípio de Honestidade dos Dados**, cada arquivo possui etiquetação clara de proveniência, fonte original, metodologia de apuração, data de referência e nível de confiança.

---

## Classificação de Proveniência

- **`OFICIAL`**: Dados publicados por órgãos de Estado (CNE, INE, Governo de Angola) em diário da república, atas de apuramento ou portais estatísticos formais.
- **`ESTIMADO`**: Dados derivados por interpolação estatística, projeções demográficas demoradas ou agregação geográfica matemática documentada.
- **`SIMULADO`**: Dados gerados para testes ou cenários prospectivos eleitorais de 2027. Devem ser claramente isolados da visualização de dados históricos.

---

## Inventário dos Arquivos em `data/raw/`

### 1. `malha_angola_dpa2016.geojson`
- **Descrição:** Delimitação cartográfica das 18 províncias históricas e principais municípios conforme a Lei da Divisão Político-Administrativa anterior (Lei n.º 18/16, de 17 de Outubro).
- **Proveniência:** `OFICIAL`
- **Fonte:** OpenStreetMap / HDX / Governo de Angola (IGCA - Instituto Geográfico e Cadastral de Angola).
- **SRID:** 4326 (WGS 84).
- **Uso:** Histórico eleitoral das eleições gerais de 2012, 2017 e 2022.

### 2. `malha_angola_dpa2024.geojson`
- **Descrição:** Delimitação cartográfica da nova Divisão Político-Administrativa (DPA 2024), expandindo o país de 18 para 21 províncias (criação das províncias de *Icolo e Bengo*, *Moxico Leste* e *Cuando*) e 325 municípios.
- **Proveniência:** `OFICIAL` (Estrutura Político-Administrativa) / `ESTIMADO` (Fronteiras vetoriais refinadas).
- **Fonte:** Diário da República de Angola — Lei da DPA 2024 / Ministério da Administração do Território (MAT).
- **SRID:** 4326 (WGS 84).
- **Uso:** Planejamento logístico e circunscrições para o pleito de 2027.

### 3. `de_para_dpa_2016_2024.json`
- **Descrição:** Tabela de correspondência territorial ("De-Para") entre os municípios e províncias da DPA 2016 e da DPA 2024. Especifica quais unidades foram desmembradas, renomeadas ou transferidas de província.
- **Proveniência:** `OFICIAL`
- **Fonte:** Lei da DPA 2024 / MAT Angola.
- **Uso:** Permite comparar séries históricas eleitorais (2022) em territórios que foram divididos para 2027.
- **Regra de votos:** o de-para parte geometria e nomes. Não redistribui os votos provinciais de 2022. Icolo e Bengo, Moxico Leste, Cuando e os remanescentes (Luanda, Moxico, Cubango, Bengo) não herdam acta OFICIAL.

### 4. `populacao_projecoes_ine.json`
- **Descrição:** Dados populacionais do Recenseamento Geral da População e Habitação (RGPH) e Projeções da População 2014-2050 publicadas pelo Instituto Nacional de Estatística (INE) de Angola.
- **Proveniência:** `OFICIAL` (Projeções Oficiais INE)
- **Fonte:** INE Angola (Publicação: *Projecção da População das Províncias e Municípios 2020-2025*).
- **Campos Principais:** `populacao_total`, `populacao_18_mais` (população em idade de votar), `populacao_jovem_18_35`, `indice_urbanizacao`.

### 5. `resultados_eleitorais_cne_2022.json`
- **Descrição:** Resultados das Eleições Gerais de 24 de Agosto de 2022 agregados pelas 18 províncias da DPA 2016. O ficheiro não contém municípios.
- **Proveniência:** `OFICIAL` (rótulo do ficheiro; conferir cada província contra a acta antes de uso externo)
- **Fonte:** Comissão Nacional Eleitoral (CNE Angola) — difusão dos resultados de 2022.
- **Campos Principais:** `eleitores_registados`, `votantes`, `abstencao_perc`, `votos_partido_a`, `votos_partido_b`, `votos_validos`.
- **Caveat:** Não há chave `municipios`. O zonamento provincial usa só esta malha de 18.
- **Contrato de grão:** município, comuna e bairro nunca recebem `proveniencia_votos=OFICIAL` enquanto este README não tiver uma linha isolada `FONTE_CNE_MUNICIPAL=SIM`. Essa linha não existe de propósito.

### 6. Pasta `geo_angola/`
- **Descrição:** Conjunto oficial de delimitações vetoriais com as 18 províncias históricas de Angola (nível ADM1: `geoBoundaries-AGO-ADM1_simplified.geojson`, `geoBoundaries-AGO-ADM1.geojson`, shapefiles e topojson) e o contorno nacional gerado (`contorno_nacional.geojson`).
- **Proveniência:** `OFICIAL` (fronteiras vetoriais de referência aberta, licença CC BY 4.0 / Public Domain conforme metadados da pasta).
- **Fonte:** Pasta `geo_angola/` do projecto (U.S. Census Bureau / geoBoundaries).
- **SRID:** 4326 (WGS 84).
- **Uso:** `GET /api/territorio/contorno-nacional`, `GET /api/territorio/geo-angola`, enriquecimento geométrico da malha DPA 2016 e visualização cartográfica na sala de comando.

### 7. `serie_historica_eleicoes_cne.json`
- **Descrição:** Totais nacionais oficiais de 2012, 2017 e 2022 (inscritos, votantes, abstenção, votos e deputados dos principais partidos) e recortes provinciais provisórios de 2017 em cinco províncias.
- **Proveniência:** `OFICIAL` no bloco nacional; `PROVISORIO` no bloco `recortes_provinciais_2017_provisorios`.
- **Fonte:** CNE via VOA (2012), proclamação de 6 Set 2017, portal `resultados2022eleicoesgerais.cne.ao` e ANGOP (2022). DW de 25 Ago 2017 para os recortes ainda com 97,82% das mesas.
- **Uso:** `GET /api/eleicoes/serie-historica` e o painel do War Room. Não alimenta o zonamento.
- **Lacuna:** município, círculo completo de 2012/2017 e infraestrutura continuam de fora. O campo `lacunas` do JSON lista o que não foi inventado.

### 8. `municipios_operacao.json`
- **Descrição:** Catálogo operacional de municípios com centróide conhecido (INE + de-para + referência geográfica). Não é o universo de 164/325.
- **Proveniência:** estrutura `OFICIAL` / população `ESTIMADO` / votos `AUSENTE` / geometria `ESTIMADO`.
- **Uso:** `GET /api/territorio/municipios`. A sala pinta vizinhos; a cor não é apuramento.

### 9. `malha_local.json`
- **Descrição:** Comunas e bairros de referência (Luanda: Maianga, Rangel, Sambizanga e bairros OSM). Sem acta CNE.
- **Proveniência:** geometria `OSM` / votos `AUSENTE`.
- **Uso:** `GET /api/territorio/local?municipio=`.
