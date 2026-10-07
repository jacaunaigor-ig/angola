/**
 * Migration 001: Extensões e Tipos Enumerados do GPS Eleitoral Angola
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "postgis";

    DO $$ BEGIN
        CREATE TYPE tipo_zonamento AS ENUM ('BASTIAO', 'CAMPO_BATALHA', 'OPOSICAO');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE tipo_sentimento AS ENUM ('POSITIVO', 'NEUTRO', 'NEGATIVO');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE categoria_dor AS ENUM (
            'AGUA', 'ENERGIA', 'EMPREGO', 'SANEAMENTO',
            'SAUDE', 'EDUCACAO', 'ESTRADAS', 'HABITACAO', 'SEGURANCA'
        );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE cargo_ativista AS ENUM (
            'COORDENADOR_PROVINCIAL', 'COORDENADOR_MUNICIPAL',
            'BRIGADISTA_TERRENO', 'DELEGADO_LISTA'
        );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE status_ata AS ENUM ('PENDENTE', 'VALIDADA', 'SUSPEITA', 'REJEITADA');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE proveniencia_dado AS ENUM ('OFICIAL', 'ESTIMADO', 'SIMULADO');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE nivel_territorial AS ENUM ('PAIS', 'PROVINCIA', 'MUNICIPIO', 'COMUNA_DISTRITO');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE tipo_relacao_dpa AS ENUM ('INALTERADA', 'DESMEMBRADA', 'REMANESCENTE', 'NOVA_UNIDADE', 'AJUSTADA');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TYPE IF EXISTS tipo_relacao_dpa;
    DROP TYPE IF EXISTS nivel_territorial;
    DROP TYPE IF EXISTS proveniencia_dado;
    DROP TYPE IF EXISTS status_ata;
    DROP TYPE IF EXISTS cargo_ativista;
    DROP TYPE IF EXISTS categoria_dor;
    DROP TYPE IF EXISTS tipo_sentimento;
    DROP TYPE IF EXISTS tipo_zonamento;
  `);
};
