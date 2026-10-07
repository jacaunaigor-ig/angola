/**
 * Migration 002: Malha Político-Administrativa Versionada e Tabela de Correspondência
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    -- 1. Versões da Divisão Político-Administrativa (ex: DPA 2016 com 18 províncias vs DPA 2024 com 21 províncias)
    CREATE TABLE IF NOT EXISTS versoes_malha (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        codigo VARCHAR(50) UNIQUE NOT NULL, -- Ex: 'DPA_2016_18P', 'DPA_2024_21P'
        nome VARCHAR(150) NOT NULL,
        diploma_legal VARCHAR(150), -- Ex: 'Lei n.º 18/16 de 17 de Outubro', 'Lei da DPA 2024'
        ano_vigencia INT NOT NULL,
        total_provincias INT NOT NULL,
        total_municipios INT NOT NULL,
        ativo_para_campanha_2027 BOOLEAN NOT NULL DEFAULT FALSE,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );

    -- 2. Unidades Territoriais (País, Província, Município, Comuna) por Versão de Malha
    CREATE TABLE IF NOT EXISTS unidades_territoriais (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        versao_malha_id UUID NOT NULL REFERENCES versoes_malha(id) ON DELETE CASCADE,
        codigo_oficial VARCHAR(50) NOT NULL, -- Ex: 'AO-LUA', 'AO-HUA', etc.
        nome VARCHAR(120) NOT NULL,
        nome_normalizado VARCHAR(120) NOT NULL,
        nivel_territorial nivel_territorial NOT NULL,
        pai_id UUID REFERENCES unidades_territoriais(id) ON DELETE SET NULL,
        centroide GEOGRAPHY(Point, 4326) NOT NULL,
        geometria_delimitacao GEOMETRY(Geometry, 4326),
        populacao_total INT,
        populacao_18_mais INT,
        populacao_jovem_18_35 INT,
        juventude_perc NUMERIC(5,2),
        eleitores_registados_cne INT,
        proveniencia_dados proveniencia_dado NOT NULL DEFAULT 'OFICIAL',
        fonte_referencia TEXT NOT NULL,
        data_referencia DATE,
        metadados JSONB,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT uk_versao_codigo UNIQUE (versao_malha_id, codigo_oficial)
    );

    -- 3. Tabela de Correspondência entre Versões da DPA ("De-Para" territorial)
    CREATE TABLE IF NOT EXISTS correspondencia_territorial (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        unidade_origem_id UUID NOT NULL REFERENCES unidades_territoriais(id) ON DELETE CASCADE,
        unidade_destino_id UUID NOT NULL REFERENCES unidades_territoriais(id) ON DELETE CASCADE,
        tipo_relacao tipo_relacao_dpa NOT NULL DEFAULT 'INALTERADA',
        percentual_reparticao_estimado NUMERIC(5,2) DEFAULT 100.00,
        notas_explicativas TEXT,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );

    CREATE INDEX IF NOT EXISTS idx_unidades_versao ON unidades_territoriais(versao_malha_id);
    CREATE INDEX IF NOT EXISTS idx_unidades_nivel ON unidades_territoriais(nivel_territorial);
    CREATE INDEX IF NOT EXISTS idx_unidades_centroide_gist ON unidades_territoriais USING GIST(centroide);
    CREATE INDEX IF NOT EXISTS idx_unidades_geom_gist ON unidades_territoriais USING GIST(geometria_delimitacao);
    CREATE INDEX IF NOT EXISTS idx_correspondencia_origem ON correspondencia_territorial(unidade_origem_id);
    CREATE INDEX IF NOT EXISTS idx_correspondencia_destino ON correspondencia_territorial(unidade_destino_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS correspondencia_territorial CASCADE;
    DROP TABLE IF EXISTS unidades_territoriais CASCADE;
    DROP TABLE IF EXISTS versoes_malha CASCADE;
  `);
};
