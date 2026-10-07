-- ==============================================================================
-- MIGRATION 09: QUEIXAS DO CANAL DO ELEITOR (WHATSAPP)
-- Persistência com retenção de 90 dias, telefones só mascarados + hash HMAC,
-- e RLS por campanha. O webhook público pode gravar campanha_id NULL.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS queixas_eleitor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campanha_id UUID REFERENCES campanhas(id) ON DELETE CASCADE,
    municipio TEXT NOT NULL,
    categoria TEXT NOT NULL,
    descricao TEXT NOT NULL,
    telefone_mascarado TEXT NOT NULL,
    telefone_hash CHAR(64) NOT NULL,
    proveniencia TEXT NOT NULL DEFAULT 'SIMULADO',
    origem TEXT NOT NULL DEFAULT 'WHATSAPP',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_queixas_eleitor_tempo
    ON queixas_eleitor (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_queixas_eleitor_agregado
    ON queixas_eleitor (municipio, categoria);

CREATE INDEX IF NOT EXISTS idx_queixas_eleitor_campanha
    ON queixas_eleitor (campanha_id, criado_em DESC);

ALTER TABLE queixas_eleitor ENABLE ROW LEVEL SECURITY;
ALTER TABLE queixas_eleitor FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS rls_queixas_campanha ON queixas_eleitor;
    CREATE POLICY rls_queixas_campanha ON queixas_eleitor
        FOR ALL
        USING (
            campanha_id IS NULL
            OR campanha_id = NULLIF(current_setting('app.current_campanha_id', true), '')::uuid
            OR current_setting('app.is_super_admin', true) = 'true'
        )
        WITH CHECK (
            campanha_id IS NULL
            OR campanha_id = NULLIF(current_setting('app.current_campanha_id', true), '')::uuid
            OR current_setting('app.is_super_admin', true) = 'true'
        );
EXCEPTION WHEN OTHERS THEN null;
END $$;

COMMENT ON TABLE queixas_eleitor IS
    'Queixas comunitárias do canal WhatsApp. Sem nomes, BI ou telefone em claro. Retenção 90 dias.';
