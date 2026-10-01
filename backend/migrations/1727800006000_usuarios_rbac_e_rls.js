/**
 * Migration 006: Usuários, Perfis RBAC, Trilha de Acesso e Row-Level Security (RLS)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    -- 1. Tipo Enum de Perfis de Usuário (RBAC)
    DO $$ BEGIN
        CREATE TYPE perfil_usuario AS ENUM ('ADMIN', 'ANALISTA', 'COORDENADOR', 'BRIGADISTA', 'LEITOR');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    -- 2. Tabela de Usuários Multi-Campanha
    CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
        nome VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        perfil perfil_usuario NOT NULL DEFAULT 'LEITOR',
        tfa_ativo BOOLEAN NOT NULL DEFAULT FALSE,
        tfa_secret VARCHAR(100),
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        ultimo_login TIMESTAMPTZ,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT uk_usuario_campanha_email UNIQUE (campanha_id, email)
    );

    -- 3. Trilha de Auditoria de Acessos e Exportações
    CREATE TABLE IF NOT EXISTS logs_auditoria_acesso (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        campanha_id UUID REFERENCES campanhas(id) ON DELETE CASCADE,
        tipo_acao VARCHAR(80) NOT NULL, -- Ex: 'LOGIN', 'EXPORT_CSV', 'APROVACAO_DISCURSO', 'SUBMISSAO_ATA'
        ip_origem VARCHAR(50),
        user_agent TEXT,
        recurso_acessado VARCHAR(200),
        metadados JSONB,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );

    -- 4. Habilitar Row Level Security (RLS) para Isolamento Multi-Tenancy
    ALTER TABLE visitas_terreno ENABLE ROW LEVEL SECURITY;
    ALTER TABLE atas_apuramento ENABLE ROW LEVEL SECURITY;
    ALTER TABLE discursos_campanha ENABLE ROW LEVEL SECURITY;
    ALTER TABLE casos_juridicos ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS baseadas na sessão da aplicação (app.current_campanha_id)
    DO $$ BEGIN
        DROP POLICY IF EXISTS rls_visitas_campanha ON visitas_terreno;
        CREATE POLICY rls_visitas_campanha ON visitas_terreno
            FOR ALL
            USING (
                campanha_id = NULLIF(current_setting('app.current_campanha_id', true), '')::uuid
                OR current_setting('app.is_super_admin', true) = 'true'
            );
    EXCEPTION WHEN OTHERS THEN null;
    END $$;

    DO $$ BEGIN
        DROP POLICY IF EXISTS rls_atas_campanha ON atas_apuramento;
        CREATE POLICY rls_atas_campanha ON atas_apuramento
            FOR ALL
            USING (
                campanha_id = NULLIF(current_setting('app.current_campanha_id', true), '')::uuid
                OR current_setting('app.is_super_admin', true) = 'true'
            );
    EXCEPTION WHEN OTHERS THEN null;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS logs_auditoria_acesso CASCADE;
    DROP TABLE IF EXISTS usuarios CASCADE;
    DROP TYPE IF EXISTS perfil_usuario;
  `);
};
