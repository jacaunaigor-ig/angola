exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS planos_comerciais (
        codigo VARCHAR(20) PRIMARY KEY,
        nome VARCHAR(80) NOT NULL,
        ambito VARCHAR(20) NOT NULL,
        preco_tabela_aoa BIGINT NOT NULL,
        limites JSONB NOT NULL DEFAULT '{}'::jsonb,
        funcionalidades JSONB NOT NULL DEFAULT '{}'::jsonb,
        ciclo VARCHAR(40) NOT NULL DEFAULT 'CICLO_ELEITORAL_2027',
        ativo BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS pedidos_proposta; DROP TABLE IF EXISTS assinaturas_campanha; DROP TABLE IF EXISTS planos_comerciais;');
};
