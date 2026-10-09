/**
 * Migration 007: UUID de cliente, auditoria genérica e imutabilidade de logs
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE visitas_terreno ADD COLUMN IF NOT EXISTS uuid UUID;
    UPDATE visitas_terreno SET uuid = id WHERE uuid IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS uk_visitas_terreno_uuid ON visitas_terreno (uuid);
    ALTER TABLE visitas_terreno ADD COLUMN IF NOT EXISTS justificativa_offline TEXT;
    ALTER TABLE visitas_terreno ADD COLUMN IF NOT EXISTS status_validacao VARCHAR(30) NOT NULL DEFAULT 'VALIDO';
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS configuracoes_campanha (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campanha_id UUID REFERENCES campanhas(id) ON DELETE CASCADE,
        chave VARCHAR(120) NOT NULL,
        valor JSONB NOT NULL DEFAULT '{}'::jsonb,
        descricao TEXT,
        atualizado_por UUID,
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_configuracoes_campanha_chave UNIQUE (campanha_id, chave)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tabela_afetada VARCHAR(120) NOT NULL,
        operacao VARCHAR(10) NOT NULL CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE')),
        usuario_id UUID,
        ip_origem INET,
        dados_antigos JSONB,
        dados_novos JSONB,
        criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION fn_auditoria_generica()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
        v_usuario_id UUID;
        v_ip INET;
    BEGIN
        BEGIN
            v_usuario_id := NULLIF(current_setting('app.current_user_id', true), '')::uuid;
        EXCEPTION WHEN others THEN
            v_usuario_id := NULL;
        END;

        BEGIN
            v_ip := NULLIF(current_setting('app.client_ip', true), '')::inet;
        EXCEPTION WHEN others THEN
            v_ip := NULL;
        END;

        IF TG_OP = 'INSERT' THEN
            INSERT INTO audit_logs (tabela_afetada, operacao, usuario_id, ip_origem, dados_antigos, dados_novos)
            VALUES (TG_TABLE_NAME, 'INSERT', v_usuario_id, v_ip, NULL, to_jsonb(NEW));
            RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
            INSERT INTO audit_logs (tabela_afetada, operacao, usuario_id, ip_origem, dados_antigos, dados_novos)
            VALUES (TG_TABLE_NAME, 'UPDATE', v_usuario_id, v_ip, to_jsonb(OLD), to_jsonb(NEW));
            RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
            INSERT INTO audit_logs (tabela_afetada, operacao, usuario_id, ip_origem, dados_antigos, dados_novos)
            VALUES (TG_TABLE_NAME, 'DELETE', v_usuario_id, v_ip, to_jsonb(OLD), NULL);
            RETURN OLD;
        END IF;
        RETURN NULL;
    END;
    $$;

    CREATE OR REPLACE FUNCTION fn_impedir_mutacao_audit_logs()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RAISE EXCEPTION
            'IMUTABILIDADE_AUDIT_LOGS: operação % directa em audit_logs é proibida. Os logs são append-only.',
            TG_OP
            USING ERRCODE = 'restrict_violation';
        RETURN NULL;
    END;
    $$;
  `);

  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_audit_locais_voto ON locais_voto;
    CREATE TRIGGER trg_audit_locais_voto
    AFTER INSERT OR UPDATE OR DELETE ON locais_voto
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

    DROP TRIGGER IF EXISTS trg_audit_configuracoes_campanha ON configuracoes_campanha;
    CREATE TRIGGER trg_audit_configuracoes_campanha
    AFTER INSERT OR UPDATE OR DELETE ON configuracoes_campanha
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

    DROP TRIGGER IF EXISTS trg_audit_visitas_terreno ON visitas_terreno;
    CREATE TRIGGER trg_audit_visitas_terreno
    AFTER INSERT OR UPDATE OR DELETE ON visitas_terreno
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

    DROP TRIGGER IF EXISTS trg_audit_logs_imutavel ON audit_logs;
    CREATE TRIGGER trg_audit_logs_imutavel
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_mutacao_audit_logs();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_audit_logs_imutavel ON audit_logs;
    DROP TRIGGER IF EXISTS trg_audit_visitas_terreno ON visitas_terreno;
    DROP TRIGGER IF EXISTS trg_audit_configuracoes_campanha ON configuracoes_campanha;
    DROP TRIGGER IF EXISTS trg_audit_locais_voto ON locais_voto;
    DROP FUNCTION IF EXISTS fn_impedir_mutacao_audit_logs();
    DROP FUNCTION IF EXISTS fn_auditoria_generica();
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS configuracoes_campanha;
    DROP INDEX IF EXISTS uk_visitas_terreno_uuid;
    ALTER TABLE visitas_terreno DROP COLUMN IF EXISTS status_validacao;
    ALTER TABLE visitas_terreno DROP COLUMN IF EXISTS justificativa_offline;
    ALTER TABLE visitas_terreno DROP COLUMN IF EXISTS uuid;
  `);
};
