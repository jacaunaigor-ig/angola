-- ==============================================================================
-- MIGRATION 07: ISOLAMENTO MULTI-TENANCY E ROW-LEVEL SECURITY (RLS)
-- Garante que campanhas e partidos nunca tenham dados misturados, mesmo sob
-- falhas acidentais de cláusulas WHERE em consultas analíticas ou de campo.
-- ==============================================================================

-- 1. Habilitação de RLS e FORCE RLS nas tabelas proprietárias de campanha
ALTER TABLE IF EXISTS visitas_terreno ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS visitas_terreno FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS atas_apuramento ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS atas_apuramento FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS discursos_campanha ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS discursos_campanha FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS casos_juridicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS casos_juridicos FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS evidencias_visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evidencias_visitas FORCE ROW LEVEL SECURITY;

-- 2. Políticas RLS de isolamento por app.current_campanha_id
DO $$ BEGIN
    DROP POLICY IF EXISTS rls_visitas_campanha ON visitas_terreno;
    CREATE POLICY rls_visitas_campanha ON visitas_terreno
        FOR ALL
        USING (
            campanha_id = NULLIF(current_setting('app.current_campanha_id', true), '')::uuid
            OR current_setting('app.is_super_admin', true) = 'true'
        )
        WITH CHECK (
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
        )
        WITH CHECK (
            campanha_id = NULLIF(current_setting('app.current_campanha_id', true), '')::uuid
            OR current_setting('app.is_super_admin', true) = 'true'
        );
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS rls_discursos_campanha ON discursos_campanha;
    CREATE POLICY rls_discursos_campanha ON discursos_campanha
        FOR ALL
        USING (
            campanha_id = NULLIF(current_setting('app.current_campanha_id', true), '')::uuid
            OR current_setting('app.is_super_admin', true) = 'true'
        )
        WITH CHECK (
            campanha_id = NULLIF(current_setting('app.current_campanha_id', true), '')::uuid
            OR current_setting('app.is_super_admin', true) = 'true'
        );
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS rls_casos_campanha ON casos_juridicos;
    CREATE POLICY rls_casos_campanha ON casos_juridicos
        FOR ALL
        USING (
            campanha_id = NULLIF(current_setting('app.current_campanha_id', true), '')::uuid
            OR current_setting('app.is_super_admin', true) = 'true'
        )
        WITH CHECK (
            campanha_id = NULLIF(current_setting('app.current_campanha_id', true), '')::uuid
            OR current_setting('app.is_super_admin', true) = 'true'
        );
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS rls_evidencias_campanha ON evidencias_visitas;
    CREATE POLICY rls_evidencias_campanha ON evidencias_visitas
        FOR ALL
        USING (
            campanha_id = NULLIF(current_setting('app.current_campanha_id', true), '')::uuid
            OR current_setting('app.is_super_admin', true) = 'true'
        )
        WITH CHECK (
            campanha_id = NULLIF(current_setting('app.current_campanha_id', true), '')::uuid
            OR current_setting('app.is_super_admin', true) = 'true'
        );
EXCEPTION WHEN OTHERS THEN null;
END $$;
