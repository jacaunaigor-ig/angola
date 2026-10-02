-- ==============================================================================
-- TRILHA DE AUDITORIA RIGOROSA — GOVERNANÇA DE CAMPANHA
-- PostgreSQL + PostGIS | GPS Eleitoral Angola 2027
-- ==============================================================================

-- 0. Colunas de unicidade e governação na ingestão de visitas (uuid do cliente)
ALTER TABLE visitas_terreno
    ADD COLUMN IF NOT EXISTS uuid UUID;

UPDATE visitas_terreno
   SET uuid = id
 WHERE uuid IS NULL;

DO $$
BEGIN
    ALTER TABLE visitas_terreno
        ALTER COLUMN uuid SET NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uk_visitas_terreno_uuid
    ON visitas_terreno (uuid);

ALTER TABLE visitas_terreno
    ADD COLUMN IF NOT EXISTS justificativa_offline TEXT;

ALTER TABLE visitas_terreno
    ADD COLUMN IF NOT EXISTS status_validacao VARCHAR(30) NOT NULL DEFAULT 'VALIDO';

-- Tabela de configuração crítica referenciada pelos gatilhos de auditoria
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

-- ==============================================================================
-- 1. TABELA IMUTÁVEL DE AUDITORIA
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_tabela_tempo
    ON audit_logs (tabela_afetada, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_operacao
    ON audit_logs (operacao, criado_em DESC);

-- ==============================================================================
-- 2. FUNÇÃO PL/pgSQL GENÉRICA DE AUDITORIA
-- Captura automaticamente INSERT/UPDATE/DELETE em tabelas críticas.
-- ==============================================================================
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
    EXCEPTION
        WHEN others THEN
            v_usuario_id := NULL;
    END;

    BEGIN
        v_ip := NULLIF(current_setting('app.client_ip', true), '')::inet;
    EXCEPTION
        WHEN others THEN
            v_ip := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            tabela_afetada, operacao, usuario_id, ip_origem, dados_antigos, dados_novos
        ) VALUES (
            TG_TABLE_NAME, 'INSERT', v_usuario_id, v_ip, NULL, to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (
            tabela_afetada, operacao, usuario_id, ip_origem, dados_antigos, dados_novos
        ) VALUES (
            TG_TABLE_NAME, 'UPDATE', v_usuario_id, v_ip, to_jsonb(OLD), to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            tabela_afetada, operacao, usuario_id, ip_origem, dados_antigos, dados_novos
        ) VALUES (
            TG_TABLE_NAME, 'DELETE', v_usuario_id, v_ip, to_jsonb(OLD), NULL
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_locais_voto ON locais_voto;
CREATE TRIGGER trg_audit_locais_voto
AFTER INSERT OR UPDATE OR DELETE ON locais_voto
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_generica();

DROP TRIGGER IF EXISTS trg_audit_configuracoes_campanha ON configuracoes_campanha;
CREATE TRIGGER trg_audit_configuracoes_campanha
AFTER INSERT OR UPDATE OR DELETE ON configuracoes_campanha
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_generica();

DROP TRIGGER IF EXISTS trg_audit_visitas_terreno ON visitas_terreno;
CREATE TRIGGER trg_audit_visitas_terreno
AFTER INSERT OR UPDATE OR DELETE ON visitas_terreno
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_generica();

DROP TRIGGER IF EXISTS trg_audit_campanhas ON campanhas;
CREATE TRIGGER trg_audit_campanhas
AFTER INSERT OR UPDATE OR DELETE ON campanhas
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_generica();

-- ==============================================================================
-- 3. IMUTABILIDADE DOS LOGS — impede DELETE (e UPDATE) directo em audit_logs
-- ==============================================================================
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

DROP TRIGGER IF EXISTS trg_audit_logs_imutavel ON audit_logs;
CREATE TRIGGER trg_audit_logs_imutavel
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION fn_impedir_mutacao_audit_logs();

REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM PUBLIC;
