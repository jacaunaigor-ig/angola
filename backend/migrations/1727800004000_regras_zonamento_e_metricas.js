/**
 * Migration 004: Regras de Zonamento Transparentes, Métricas e Governança de Discursos
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    -- 1. Regras Matemáticas e Transparentes de Zonamento Político
    CREATE TABLE IF NOT EXISTS regras_zonamento (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campanha_id UUID REFERENCES campanhas(id) ON DELETE CASCADE,
        nome_regra VARCHAR(120) NOT NULL,
        formula_codigo VARCHAR(60) NOT NULL DEFAULT 'MARGEM_BIDIRECIONAL_CNE_V1',
        descricao_formula TEXT NOT NULL,
        limiar_bastiao_margem NUMERIC(5,2) NOT NULL DEFAULT 15.00,
        limiar_oposicao_margem NUMERIC(5,2) NOT NULL DEFAULT -15.00,
        peso_demografia_jovem NUMERIC(4,2) NOT NULL DEFAULT 0.00,
        peso_abstencao NUMERIC(4,2) NOT NULL DEFAULT 0.00,
        padrao_sistema BOOLEAN NOT NULL DEFAULT FALSE,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );

    -- 2. Métricas Eleitorais e Demográficas Agregadas por Unidade Territorial
    CREATE TABLE IF NOT EXISTS metricas_territoriais (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        unidade_territorial_id UUID NOT NULL REFERENCES unidades_territoriais(id) ON DELETE CASCADE,
        eleicao_ano INT NOT NULL,
        total_eleitores_aptos INT NOT NULL DEFAULT 0,
        total_votantes INT NOT NULL DEFAULT 0,
        abstencao_indice NUMERIC(5,4),
        votos_partido_referencia INT NOT NULL DEFAULT 0,
        votos_oposicao_referencia INT NOT NULL DEFAULT 0,
        votos_partido_referencia_perc NUMERIC(5,2),
        votos_oposicao_referencia_perc NUMERIC(5,2),
        margem_apurada_perc NUMERIC(6,2),
        zonamento_calculado tipo_zonamento NOT NULL,
        regra_zonamento_id UUID REFERENCES regras_zonamento(id) ON DELETE SET NULL,
        formula_explicativa TEXT NOT NULL,
        proveniencia proveniencia_dado NOT NULL DEFAULT 'OFICIAL',
        fonte_detalhada TEXT NOT NULL,
        data_referencia DATE NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT uk_metrica_unidade_ano UNIQUE (unidade_territorial_id, eleicao_ano)
    );

    -- 3. Governança e Ciclo de Vida dos Discursos Gerados por IA
    CREATE TABLE IF NOT EXISTS discursos_campanha (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
        unidade_territorial_id UUID NOT NULL REFERENCES unidades_territoriais(id) ON DELETE CASCADE,
        modelo_ia_utilizado VARCHAR(100) NOT NULL, -- Ex: 'claude-3-5-sonnet-20241022', 'heuristico_v1'
        prompt_utilizado TEXT,
        hook_abertura TEXT NOT NULL,
        compromissos_propostas JSONB NOT NULL DEFAULT '[]',
        bloco_juventude TEXT NOT NULL,
        armadilhas_evitar JSONB NOT NULL DEFAULT '[]',
        status_aprovacao VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO' CHECK (status_aprovacao IN ('RASCUNHO', 'EM_REVISAO', 'APROVADO', 'REJEITADO')),
        responsavel_revisao VARCHAR(150),
        comentarios_revisao TEXT,
        aprovado_em TIMESTAMPTZ,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );

    CREATE INDEX IF NOT EXISTS idx_metricas_unidade ON metricas_territoriais(unidade_territorial_id);
    CREATE INDEX IF NOT EXISTS idx_metricas_zonamento ON metricas_territoriais(zonamento_calculado);
    CREATE INDEX IF NOT EXISTS idx_discursos_campanha_unidade ON discursos_campanha(campanha_id, unidade_territorial_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS discursos_campanha CASCADE;
    DROP TABLE IF EXISTS metricas_territoriais CASCADE;
    DROP TABLE IF EXISTS regras_zonamento CASCADE;
  `);
};
