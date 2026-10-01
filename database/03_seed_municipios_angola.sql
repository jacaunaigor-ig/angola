-- ==============================================================================
-- CARGA OFICIAL CONSOLIDADA: ASSEMBLEIAS E MUNICÍPIOS DE ANGOLA 2027
-- ==============================================================================

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-LUA-TAL-001',
    'Escola Primária 1024 - Morro Bento',
    'Luanda',
    'Talatona',
    8,
    4200,
    'BASTIAO',
    ST_SetSRID(ST_MakePoint(13.2667, -8.9167), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-LUA-TAL-002',
    'Complexo Escolar Cidade Universitária',
    'Luanda',
    'Talatona',
    12,
    6500,
    'CAMPO_BATALHA',
    ST_SetSRID(ST_MakePoint(13.285, -8.932), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-LUA-TAL-003',
    'Colégio Angolano de Talatona',
    'Luanda',
    'Talatona',
    7,
    3800,
    'CAMPO_BATALHA',
    ST_SetSRID(ST_MakePoint(13.254, -8.921), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-LUA-VIA-001',
    'Escola Polivalente de Viana',
    'Luanda',
    'Viana',
    15,
    7800,
    'OPOSICAO',
    ST_SetSRID(ST_MakePoint(13.3667, -8.91), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-LUA-VIA-002',
    'Complexo Escolar Capalanga',
    'Luanda',
    'Viana',
    11,
    5900,
    'OPOSICAO',
    ST_SetSRID(ST_MakePoint(13.385, -8.895), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-LUA-VIA-003',
    'Escola Comandante Bula - Zango 3',
    'Luanda',
    'Viana',
    16,
    8200,
    'OPOSICAO',
    ST_SetSRID(ST_MakePoint(13.43, -8.98), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-LUA-CAC-001',
    'Liceu de Cacuaco n.º 4050',
    'Luanda',
    'Cacuaco',
    10,
    5100,
    'OPOSICAO',
    ST_SetSRID(ST_MakePoint(13.35, -8.7833), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-LUA-CAC-002',
    'Escola Primária da Sequele',
    'Luanda',
    'Cacuaco',
    12,
    6400,
    'CAMPO_BATALHA',
    ST_SetSRID(ST_MakePoint(13.46, -8.745), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-LUA-LUA-001',
    'Liceu Mutu-ya-Kevela',
    'Luanda',
    'Luanda',
    14,
    7200,
    'BASTIAO',
    ST_SetSRID(ST_MakePoint(13.235, -8.815), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-LUA-LUA-002',
    'Escola Ngola Kiluanje',
    'Luanda',
    'Luanda',
    13,
    6800,
    'CAMPO_BATALHA',
    ST_SetSRID(ST_MakePoint(13.245, -8.825), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-HUA-HUA-001',
    'Escola Secundária do Huambo',
    'Huambo',
    'Huambo',
    14,
    7200,
    'BASTIAO',
    ST_SetSRID(ST_MakePoint(15.7392, -12.7761), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-HUA-HUA-002',
    'Complexo Escolar de São Pedro',
    'Huambo',
    'Huambo',
    10,
    5400,
    'BASTIAO',
    ST_SetSRID(ST_MakePoint(15.72, -12.79), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-HUI-LUB-001',
    'Instituto Médio Politécnico do Lubango',
    'Huíla',
    'Lubango',
    13,
    6900,
    'CAMPO_BATALHA',
    ST_SetSRID(ST_MakePoint(13.4925, -14.9172), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-HUI-LUB-002',
    'Escola do Comércio do Lubango',
    'Huíla',
    'Lubango',
    9,
    4800,
    'BASTIAO',
    ST_SetSRID(ST_MakePoint(13.51, -14.93), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-BEN-BEN-001',
    'Liceu Comandante Cassanje',
    'Benguela',
    'Benguela',
    11,
    5800,
    'CAMPO_BATALHA',
    ST_SetSRID(ST_MakePoint(13.4055, -12.5763), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-BEN-LOB-001',
    'Colégio São José - Caponte',
    'Benguela',
    'Lobito',
    9,
    4600,
    'CAMPO_BATALHA',
    ST_SetSRID(ST_MakePoint(13.5436, -12.3644), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-BEN-LOB-002',
    'Complexo Escolar da Restinga',
    'Benguela',
    'Lobito',
    7,
    3900,
    'OPOSICAO',
    ST_SetSRID(ST_MakePoint(13.56, -12.34), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    'CNE-CAB-CAB-001',
    'Escola Barão Puna',
    'Cabinda',
    'Cabinda',
    10,
    5200,
    'OPOSICAO',
    ST_SetSRID(ST_MakePoint(12.196, -5.556), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;

