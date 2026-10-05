-- ==============================================================================
-- CARGA DE DADOS TERRITORIAIS OFICIAIS VERSIONADOS - PIPELINE ETL
-- Gerado em: 2026-10-05T16:54:50.941Z
-- Proveniência: OFICIAL (CNE 2022 / INE Projeções / Lei DPA)
-- ==============================================================================

INSERT INTO versoes_malha (codigo, nome, diploma_legal, ano_vigencia, total_provincias, total_municipios, ativo_para_campanha_2027)
VALUES 
('DPA_2016_18P', 'Divisão Político-Administrativa Lei 18/16 (18 Províncias)', 'Lei n.º 18/16 de 17 de Outubro', 2016, 18, 164, FALSE),
('DPA_2024_21P', 'Nova Divisão Político-Administrativa 2024 (21 Províncias)', 'Lei da Divisão Político-Administrativa 2024', 2024, 21, 325, TRUE)
ON CONFLICT (codigo) DO UPDATE SET ativo_para_campanha_2027 = EXCLUDED.ativo_para_campanha_2027;

INSERT INTO regras_zonamento (nome_regra, formula_codigo, descricao_formula, limiar_bastiao_margem, limiar_oposicao_margem, padrao_sistema, ativo)
VALUES (
    'Regra Padrão por Margem de Votos Válidos CNE',
    'MARGEM_BIDIRECIONAL_CNE_V1',
    'Margem = (% Votos Partido - % Votos Principal Oponente). Se Margem >= +15.00% => BASTIAO; Se Margem <= -15.00% => OPOSICAO; Caso contrário => CAMPO_BATALHA',
    15,
    -15,
    TRUE,
    TRUE
) ON CONFLICT DO NOTHING;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-LUA',
    'Luanda',
    'LUANDA',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(13.2343, -8.8368), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13,-8.6],[13.6,-8.6],[13.6,-9.2],[13,-9.2],[13,-8.6]]]}'), 4326),
    9300000,
    4850000,
    67,
    4652250,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Luanda","regiao":"Norte Litoral","zonamento_calculado":"OPOSICAO","margem_cne":-29.28}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-LUA' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    4652250,
    2419170,
    0.4800,
    783100,
    1471600,
    33.31,
    62.59,
    -29.28,
    'OPOSICAO',
    'Margem de -29.28% calculada por: (33.31% - 62.59%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-CAB',
    'Cabinda',
    'CABINDA',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(12.196, -5.556), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[12,-5.2],[12.8,-5.2],[12.8,-5.9],[12,-5.9],[12,-5.2]]]}'), 4326),
    850000,
    420000,
    66.7,
    352400,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Cabinda","regiao":"Norte Enclave","zonamento_calculado":"OPOSICAO","margem_cne":-42.19}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-CAB' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    352400,
    183248,
    0.4800,
    47050,
    122360,
    26.36,
    68.55,
    -42.19,
    'OPOSICAO',
    'Margem de -42.19% calculada por: (26.36% - 68.55%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-ZAI',
    'Zaire',
    'ZAIRE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(14.2401, -6.267), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[12.5,-5.9],[15,-5.9],[15,-7.5],[12.5,-7.5],[12.5,-5.9]]]}'), 4326),
    NULL,
    NULL,
    NULL,
    242000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Mbanza Kongo","regiao":"Norte","zonamento_calculado":"OPOSICAO","margem_cne":-15.78}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-ZAI' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    242000,
    121000,
    0.5000,
    42567,
    61061,
    36.32,
    52.1,
    -15.78,
    'OPOSICAO',
    'Margem de -15.78% calculada por: (36.32% - 52.1%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-UIG',
    'Uíge',
    'UÍGE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(15.0583, -7.6152), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[14.5,-6.8],[16.5,-6.8],[16.5,-8.5],[14.5,-8.5],[14.5,-6.8]]]}'), 4326),
    1800000,
    860000,
    57,
    720000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Uíge","regiao":"Norte","zonamento_calculado":"BASTIAO","margem_cne":19.85}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-UIG' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    720000,
    345600,
    0.5200,
    188538,
    122834,
    56.96,
    37.11,
    19.85,
    'BASTIAO',
    'Margem de +19.85% calculada por: (56.96% - 37.11%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-BGO',
    'Bengo',
    'BENGO',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(13.6644, -8.5785), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13.2,-7.8],[14.5,-7.8],[14.5,-9.5],[13.2,-9.5],[13.2,-7.8]]]}'), 4326),
    NULL,
    NULL,
    NULL,
    230000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Caxito","regiao":"Norte Litoral","zonamento_calculado":"BASTIAO","margem_cne":18}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-BGO' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    230000,
    121900,
    0.4700,
    65520,
    44460,
    56,
    38,
    18,
    'BASTIAO',
    'Margem de +18% calculada por: (56% - 38%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-CNN',
    'Cuanza Norte',
    'CUANZA NORTE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(14.9116, -9.2979), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[14.2,-8.5],[15.5,-8.5],[15.5,-9.8],[14.2,-9.8],[14.2,-8.5]]]}'), 4326),
    NULL,
    NULL,
    NULL,
    240000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Ndalatando","regiao":"Centro Norte","zonamento_calculado":"BASTIAO","margem_cne":32}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-CNN' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    240000,
    120000,
    0.5000,
    71820,
    35340,
    63,
    31,
    32,
    'BASTIAO',
    'Margem de +32% calculada por: (63% - 31%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-CUS',
    'Cuanza Sul',
    'CUANZA SUL',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(14.8941, -11.2061), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13.8,-9.5],[16.2,-9.5],[16.2,-12],[13.8,-12],[13.8,-9.5]]]}'), 4326),
    NULL,
    NULL,
    NULL,
    890000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Sumbe","regiao":"Centro Litoral","zonamento_calculado":"BASTIAO","margem_cne":37}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-CUS' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    890000,
    453900,
    0.4900,
    287100,
    126150,
    66,
    29,
    37,
    'BASTIAO',
    'Margem de +37% calculada por: (66% - 29%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-MAL',
    'Malanje',
    'MALANJE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(16.341, -9.5402), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[15.5,-8],[18.2,-8],[18.2,-11.5],[15.5,-11.5],[15.5,-8]]]}'), 4326),
    1250000,
    610000,
    55.7,
    540000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Malanje","regiao":"Centro Norte","zonamento_calculado":"BASTIAO","margem_cne":20.26}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-MAL' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    540000,
    270000,
    0.5000,
    150182,
    97911,
    58.21,
    37.95,
    20.26,
    'BASTIAO',
    'Margem de +20.26% calculada por: (58.21% - 37.95%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-LNO',
    'Lunda Norte',
    'LUNDA NORTE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(20.8333, -8.4167), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[17.5,-7],[22,-7],[22,-10],[17.5,-10],[17.5,-7]]]}'), 4326),
    NULL,
    NULL,
    NULL,
    410000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Dundo","regiao":"Leste","zonamento_calculado":"BASTIAO","margem_cne":27}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-LNO' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    410000,
    196800,
    0.5200,
    112200,
    61710,
    60,
    33,
    27,
    'BASTIAO',
    'Margem de +27% calculada por: (60% - 33%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-LSU',
    'Lunda Sul',
    'LUNDA SUL',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(20.3917, -9.6608), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[19,-9],[22.2,-9],[22.2,-11.5],[19,-11.5],[19,-9]]]}'), 4326),
    NULL,
    NULL,
    NULL,
    280000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Saurimo","regiao":"Leste","zonamento_calculado":"CAMPO_BATALHA","margem_cne":12}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-LSU' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    280000,
    134400,
    0.5200,
    66040,
    50800,
    52,
    40,
    12,
    'CAMPO_BATALHA',
    'Margem de +12% calculada por: (52% - 40%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-BEN',
    'Benguela',
    'BENGUELA',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(13.4055, -12.5763), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13,-11.8],[15,-11.8],[15,-13.5],[13,-13.5],[13,-11.8]]]}'), 4326),
    2750000,
    1390000,
    63.3,
    1201000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Benguela","regiao":"Centro Litoral","zonamento_calculado":"CAMPO_BATALHA","margem_cne":10.84}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-BEN' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    1201000,
    564470,
    0.5300,
    296314,
    237127,
    54.27,
    43.43,
    10.84,
    'CAMPO_BATALHA',
    'Margem de +10.84% calculada por: (54.27% - 43.43%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-HUA',
    'Huambo',
    'HUAMBO',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(15.7392, -12.7761), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[15,-12],[16.5,-12],[16.5,-13.6],[15,-13.6],[15,-12]]]}'), 4326),
    2600000,
    1280000,
    58.6,
    1104000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Huambo","regiao":"Planalto Central","zonamento_calculado":"CAMPO_BATALHA","margem_cne":1.65}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-HUA' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    1104000,
    540960,
    0.5100,
    257500,
    248890,
    49.33,
    47.68,
    1.65,
    'CAMPO_BATALHA',
    'Margem de +1.65% calculada por: (49.33% - 47.68%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-BIE',
    'Bié',
    'BIÉ',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(16.9333, -12.3833), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[16.2,-11],[18.8,-11],[18.8,-14.2],[16.2,-14.2],[16.2,-11]]]}'), 4326),
    2050000,
    950000,
    56.8,
    782000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Kuito","regiao":"Planalto Central","zonamento_calculado":"BASTIAO","margem_cne":23.67}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-BIE' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    782000,
    383180,
    0.5100,
    223171,
    135828,
    60.48,
    36.81,
    23.67,
    'BASTIAO',
    'Margem de +23.67% calculada por: (60.48% - 36.81%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-MOX',
    'Moxico',
    'MOXICO',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(19.9167, -13.45), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[18.5,-11],[24,-11],[24,-15.5],[18.5,-15.5],[18.5,-11]]]}'), 4326),
    NULL,
    NULL,
    NULL,
    380000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Luena","regiao":"Leste","zonamento_calculado":"BASTIAO","margem_cne":34}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-MOX' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    380000,
    182400,
    0.5200,
    110720,
    51900,
    64,
    30,
    34,
    'BASTIAO',
    'Margem de +34% calculada por: (64% - 30%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-HUI',
    'Huíla',
    'HUÍLA',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(13.4925, -14.9172), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13.2,-13.5],[16.5,-13.5],[16.5,-16.2],[13.2,-16.2],[13.2,-13.5]]]}'), 4326),
    3100000,
    1450000,
    57.9,
    1250000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Lubango","regiao":"Sul","zonamento_calculado":"BASTIAO","margem_cne":38.59}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-HUI' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    1250000,
    600000,
    0.5200,
    388456,
    164249,
    66.86,
    28.27,
    38.59,
    'BASTIAO',
    'Margem de +38.59% calculada por: (66.86% - 28.27%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-NAM',
    'Namibe',
    'NAMIBE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(12.1522, -15.1961), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[11.7,-13.8],[13.5,-13.8],[13.5,-17.3],[11.7,-17.3],[11.7,-13.8]]]}'), 4326),
    NULL,
    NULL,
    NULL,
    260000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Moçâmedes","regiao":"Sul Litoral","zonamento_calculado":"BASTIAO","margem_cne":25}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-NAM' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    260000,
    132600,
    0.4900,
    76200,
    44450,
    60,
    35,
    25,
    'BASTIAO',
    'Margem de +25% calculada por: (60% - 35%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-CUN',
    'Cunene',
    'CUNENE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(15.7333, -16.85), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[14.5,-15.5],[17.5,-15.5],[17.5,-17.4],[14.5,-17.4],[14.5,-15.5]]]}'), 4326),
    NULL,
    NULL,
    NULL,
    430000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Ondjiva","regiao":"Sul Fronteira","zonamento_calculado":"BASTIAO","margem_cne":69}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-CUN' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    430000,
    215000,
    0.5000,
    169320,
    28560,
    83,
    14,
    69,
    'BASTIAO',
    'Margem de +69% calculada por: (83% - 14%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    'AO-CCU',
    'Cuando Cubango',
    'CUANDO CUBANGO',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(17.691, -15.4208), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[16.5,-14],[23.5,-14],[23.5,-18],[16.5,-18],[16.5,-14]]]}'), 4326),
    NULL,
    NULL,
    NULL,
    265000,
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    '{"capital":"Menongue","regiao":"Sudeste","zonamento_calculado":"BASTIAO","margem_cne":41}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;

INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = 'AO-CCU' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    265000,
    132500,
    0.5000,
    85680,
    34020,
    68,
    27,
    41,
    'BASTIAO',
    'Margem de +41% calculada por: (68% - 27%). Limiares de corte: Bastião >= +15% | Oposição <= -15%.',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-LUA',
    'Luanda',
    'LUANDA',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(13.2343, -8.8368), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13.1,-8.7],[13.4,-8.7],[13.4,-9],[13.1,-9],[13.1,-8.7]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Luanda","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-ICB',
    'Icolo e Bengo',
    'ICOLO E BENGO',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(13.698, -9.117), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13.3,-8.9],[13.9,-8.9],[13.9,-9.6],[13.3,-9.6],[13.3,-8.9]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Catete","nova_provincia":true}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-CAB',
    'Cabinda',
    'CABINDA',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(12.196, -5.556), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[12,-5.2],[12.8,-5.2],[12.8,-5.9],[12,-5.9],[12,-5.2]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Cabinda","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-ZAI',
    'Zaire',
    'ZAIRE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(14.2401, -6.267), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[12.5,-5.9],[15,-5.9],[15,-7.5],[12.5,-7.5],[12.5,-5.9]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Mbanza Kongo","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-UIG',
    'Uíge',
    'UÍGE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(15.0583, -7.6152), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[14.5,-6.8],[16.5,-6.8],[16.5,-8.5],[14.5,-8.5],[14.5,-6.8]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Uíge","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-BGO',
    'Bengo',
    'BENGO',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(13.6644, -8.5785), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13.2,-7.8],[14.5,-7.8],[14.5,-8.9],[13.2,-8.9],[13.2,-7.8]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Caxito","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-CNN',
    'Cuanza Norte',
    'CUANZA NORTE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(14.9116, -9.2979), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[14.2,-8.5],[15.5,-8.5],[15.5,-9.8],[14.2,-9.8],[14.2,-8.5]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Ndalatando","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-CUS',
    'Cuanza Sul',
    'CUANZA SUL',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(14.8941, -11.2061), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13.8,-9.5],[16.2,-9.5],[16.2,-12],[13.8,-12],[13.8,-9.5]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Sumbe","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-MAL',
    'Malanje',
    'MALANJE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(16.341, -9.5402), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[15.5,-8],[18.2,-8],[18.2,-11.5],[15.5,-11.5],[15.5,-8]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Malanje","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-LNO',
    'Lunda Norte',
    'LUNDA NORTE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(20.8333, -8.4167), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[17.5,-7],[22,-7],[22,-10],[17.5,-10],[17.5,-7]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Dundo","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-LSU',
    'Lunda Sul',
    'LUNDA SUL',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(20.3917, -9.6608), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[19,-9],[22.2,-9],[22.2,-11.5],[19,-11.5],[19,-9]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Saurimo","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-BEN',
    'Benguela',
    'BENGUELA',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(13.4055, -12.5763), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13,-11.8],[15,-11.8],[15,-13.5],[13,-13.5],[13,-11.8]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Benguela","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-HUA',
    'Huambo',
    'HUAMBO',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(15.7392, -12.7761), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[15,-12],[16.5,-12],[16.5,-13.6],[15,-13.6],[15,-12]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Huambo","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-BIE',
    'Bié',
    'BIÉ',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(16.9333, -12.3833), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[16.2,-11],[18.8,-11],[18.8,-14.2],[16.2,-14.2],[16.2,-11]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Kuito","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-MOX',
    'Moxico',
    'MOXICO',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(19.9167, -13.45), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[18.5,-11],[21.5,-11],[21.5,-14.5],[18.5,-14.5],[18.5,-11]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Luena","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-MXL',
    'Moxico Leste',
    'MOXICO LESTE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(22.2246, -10.7073), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[21.5,-10.5],[24,-10.5],[24,-14],[21.5,-14],[21.5,-10.5]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Luau","nova_provincia":true}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-HUI',
    'Huíla',
    'HUÍLA',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(13.4925, -14.9172), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[13.2,-13.5],[16.5,-13.5],[16.5,-16.2],[13.2,-16.2],[13.2,-13.5]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Lubango","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-NAM',
    'Namibe',
    'NAMIBE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(12.1522, -15.1961), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[11.7,-13.8],[13.5,-13.8],[13.5,-17.3],[11.7,-17.3],[11.7,-13.8]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Moçâmedes","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-CUN',
    'Cunene',
    'CUNENE',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(15.7333, -16.85), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[14.5,-15.5],[17.5,-15.5],[17.5,-17.4],[14.5,-17.4],[14.5,-15.5]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Ondjiva","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-CUB',
    'Cubango',
    'CUBANGO',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(17.691, -14.65), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[16.5,-14],[19.8,-14],[19.8,-17.8],[16.5,-17.8],[16.5,-14]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Menongue","nova_provincia":false}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    'AO-CDO',
    'Cuando',
    'CUANDO',
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(20.3667, -15.7833), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[19.8,-14],[23.5,-14],[23.5,-18],[19.8,-18],[19.8,-14]]]}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    '{"capital":"Mavinga","nova_provincia":true}'
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Luanda' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Luanda' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'REMANESCENTE',
    'Transição DPA 2016 para DPA 2024: REMANESCENTE_URBANA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Luanda' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Icolo e Bengo' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'NOVA_UNIDADE',
    'Transição DPA 2016 para DPA 2024: NOVA_PROVINCIA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Moxico' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Moxico' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'REMANESCENTE',
    'Transição DPA 2016 para DPA 2024: REMANESCENTE_OESTE'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Moxico' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Moxico Leste' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'NOVA_UNIDADE',
    'Transição DPA 2016 para DPA 2024: NOVA_PROVINCIA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Cuando Cubango' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Cubango' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'REMANESCENTE',
    'Transição DPA 2016 para DPA 2024: REMANESCENTE_OESTE'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Cuando Cubango' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Cuando' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'NOVA_UNIDADE',
    'Transição DPA 2016 para DPA 2024: NOVA_PROVINCIA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Huambo' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Huambo' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: INALTERADA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Benguela' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Benguela' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: INALTERADA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Huíla' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Huíla' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: INALTERADA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Cabinda' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Cabinda' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: INALTERADA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Bié' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Bié' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: INALTERADA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Malanje' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Malanje' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: INALTERADA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Uíge' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Uíge' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: INALTERADA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Cuanza Sul' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Cuanza Sul' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: INALTERADA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Cuanza Norte' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Cuanza Norte' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: INALTERADA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Zaire' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Zaire' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: INALTERADA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Lunda Norte' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Lunda Norte' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: INALTERADA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Lunda Sul' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Lunda Sul' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: INALTERADA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Cunene' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Cunene' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: INALTERADA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Namibe' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Namibe' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: INALTERADA'
) ON CONFLICT DO NOTHING;

INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = 'Bengo' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = 'Bengo' AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    'INALTERADA',
    'Transição DPA 2016 para DPA 2024: AJUSTADA_SEM_ICOLO'
) ON CONFLICT DO NOTHING;

