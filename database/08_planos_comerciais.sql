-- Catálogo comercial e assinaturas por campanha (Municipal / Provincial / Nacional)

CREATE TABLE IF NOT EXISTS planos_comerciais (
    codigo VARCHAR(20) PRIMARY KEY,
    nome VARCHAR(80) NOT NULL,
    ambito VARCHAR(20) NOT NULL CHECK (ambito IN ('MUNICIPIO', 'PROVINCIA', 'NACIONAL')),
    preco_tabela_aoa BIGINT NOT NULL CHECK (preco_tabela_aoa >= 0),
    limites JSONB NOT NULL DEFAULT '{}'::jsonb,
    funcionalidades JSONB NOT NULL DEFAULT '{}'::jsonb,
    ciclo VARCHAR(40) NOT NULL DEFAULT 'CICLO_ELEITORAL_2027',
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS assinaturas_campanha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
    plano_codigo VARCHAR(20) NOT NULL REFERENCES planos_comerciais(codigo),
    territorio_municipio VARCHAR(120),
    territorio_provincia VARCHAR(120),
    estado VARCHAR(20) NOT NULL DEFAULT 'ATIVA' CHECK (estado IN ('RASCUNHO', 'ATIVA', 'SUSPENSA', 'ENCERRADA')),
    ciclo VARCHAR(40) NOT NULL DEFAULT 'CICLO_ELEITORAL_2027',
    valor_contratado_aoa BIGINT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_assinatura_campanha_ciclo UNIQUE (campanha_id, ciclo)
);

CREATE TABLE IF NOT EXISTS pedidos_proposta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocolo VARCHAR(40) NOT NULL UNIQUE,
    organizacao VARCHAR(200) NOT NULL,
    contacto VARCHAR(150) NOT NULL,
    telefone VARCHAR(50),
    email VARCHAR(150),
    plano_codigo VARCHAR(20) NOT NULL,
    territorio VARCHAR(150),
    notas TEXT,
    orcamento JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'NOVO',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO planos_comerciais (codigo, nome, ambito, preco_tabela_aoa, limites, funcionalidades)
VALUES
(
    'MUNICIPAL', 'Plano Municipal', 'MUNICIPIO', 4800000,
    '{"contas_war_room":5,"brigadistas":40,"visitas_mes":8000,"discursos_ia_mes":15,"assembleias_dia_d":0}'::jsonb,
    '{"dia_d":false,"casos_juridicos":false,"invalidar_lote":false,"hq_nacional":false}'::jsonb
),
(
    'PROVINCIAL', 'Plano Provincial', 'PROVINCIA', 18500000,
    '{"contas_war_room":20,"brigadistas":250,"visitas_mes":60000,"discursos_ia_mes":80,"assembleias_dia_d":400}'::jsonb,
    '{"dia_d":true,"casos_juridicos":true,"invalidar_lote":true,"hq_nacional":false}'::jsonb
),
(
    'NACIONAL', 'Plano Nacional / HQ', 'NACIONAL', 62000000,
    '{"contas_war_room":80,"brigadistas":2000,"visitas_mes":400000,"discursos_ia_mes":400,"assembleias_dia_d":13000}'::jsonb,
    '{"dia_d":true,"casos_juridicos":true,"invalidar_lote":true,"hq_nacional":true}'::jsonb
)
ON CONFLICT (codigo) DO UPDATE SET
    preco_tabela_aoa = EXCLUDED.preco_tabela_aoa,
    limites = EXCLUDED.limites,
    funcionalidades = EXCLUDED.funcionalidades;
