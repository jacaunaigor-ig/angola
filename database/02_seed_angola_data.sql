-- ==============================================================================
-- DADOS INICIAIS (SEED) PARA TESTES DO GPS ELEITORAL ANGOLA 2027
-- ==============================================================================

-- 1. Inserir Campanha B2B de Teste
INSERT INTO campanhas (id, nome, partido_coligacao, eleicao_ano, ativo)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Campanha Presidencial & Legislativa 2027',
    'Coligação Esperança Angola',
    2027,
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- 2. Inserir Ativistas de Terreno
INSERT INTO ativistas (id, campanha_id, nome, telefone, cargo, device_id, ativo)
VALUES 
(
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Manuel Gaspar',
    '+244923000111',
    'BRIGADISTA_TERRENO',
    'DEV-SAMSUNG-A14-01',
    TRUE
),
(
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Esperança dos Santos',
    '+244931222333',
    'COORDENADOR_MUNICIPAL',
    'DEV-XIAOMI-NOTE12-02',
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- 3. Inserir Principais Assembleias de Voto (Locais de Voto Oficiais CNE)
INSERT INTO locais_voto (id, codigo_cne, nome, provincia, municipio, comuna_distrito, bairro_aldeia, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'CNE-LUA-TAL-001',
    'Escola Primária 1024 - Morro Bento',
    'Luanda',
    'Talatona',
    'Talatona',
    'Morro Bento II',
    8,
    4200,
    'BASTIAO',
    ST_SetSRID(ST_MakePoint(13.2667, -8.9167), 4326)::geography
),
(
    'c0000000-0000-0000-0000-000000000002',
    'CNE-LUA-TAL-002',
    'Complexo Escolar Cidade Universitária',
    'Luanda',
    'Talatona',
    'Camama',
    'Camama 1',
    12,
    6500,
    'CAMPO_BATALHA',
    ST_SetSRID(ST_MakePoint(13.2850, -8.9320), 4326)::geography
),
(
    'c0000000-0000-0000-0000-000000000003',
    'CNE-LUA-VIA-001',
    'Escola Polivalente de Viana',
    'Luanda',
    'Viana',
    'Viana Sede',
    'Vila Nova',
    15,
    7800,
    'OPOSICAO',
    ST_SetSRID(ST_MakePoint(13.3667, -8.9100), 4326)::geography
),
(
    'c0000000-0000-0000-0000-000000000004',
    'CNE-LUA-CAC-001',
    'Liceu de Cacuaco n.º 4050',
    'Luanda',
    'Cacuaco',
    'Cacuaco Sede',
    'Belo Monte',
    10,
    5100,
    'OPOSICAO',
    ST_SetSRID(ST_MakePoint(13.3500, -8.7833), 4326)::geography
),
(
    'c0000000-0000-0000-0000-000000000005',
    'CNE-HUA-HUA-001',
    'Escola do Ensino Secundário do Huambo',
    'Huambo',
    'Huambo',
    'Huambo Sede',
    'Cidade Alta',
    14,
    7200,
    'BASTIAO',
    ST_SetSRID(ST_MakePoint(15.7392, -12.7761), 4326)::geography
),
(
    'c0000000-0000-0000-0000-000000000006',
    'CNE-BEN-LOB-001',
    'Colégio São José - Lobito',
    'Benguela',
    'Lobito',
    'Lobito',
    'Caponte',
    9,
    4600,
    'CAMPO_BATALHA',
    ST_SetSRID(ST_MakePoint(13.5436, -12.3644), 4326)::geography
) ON CONFLICT (id) DO NOTHING;

-- 4. Inserir Amostra Inicial de Visitas de Terreno (Para teste imediato do Dashboard)
INSERT INTO visitas_terreno (id, uuid, campanha_id, ativista_id, localizacao, precisao_gps_metros, sentimento, dores_prioritarias, faixa_etaria, observacoes, registado_em, sincronizado)
VALUES
(
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    ST_SetSRID(ST_MakePoint(13.2660, -8.9160), 4326)::geography,
    4.5,
    'POSITIVO',
    ARRAY['EMPREGO', 'ENERGIA']::categoria_dor[],
    '25-35',
    'Eleitor satisfeito com projetos de formação técnica na zona.',
    NOW() - INTERVAL '3 hours',
    TRUE
),
(
    'd0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    ST_SetSRID(ST_MakePoint(13.2675, -8.9172), 4326)::geography,
    6.1,
    'NEUTRO',
    ARRAY['AGUA', 'SANEAMENTO']::categoria_dor[],
    '18-24',
    'Reclama da distribuição irregular de água potável no bairro.',
    NOW() - INTERVAL '2 hours',
    TRUE
),
(
    'd0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    ST_SetSRID(ST_MakePoint(13.2690, -8.9150), 4326)::geography,
    3.2,
    'POSITIVO',
    ARRAY['SEGURANCA']::categoria_dor[],
    '36-50',
    'Elogiou policiamento comunitário recente.',
    NOW() - INTERVAL '1 hour',
    TRUE
) ON CONFLICT (id) DO NOTHING;
