/**
 * Migration 005: Índices Espaciais GiST, GIN e Triggers de Auditoria
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    -- 1. Índices Espaciais GiST (WGS 84 SRID 4326 em Metros)
    CREATE INDEX IF NOT EXISTS idx_locais_voto_geom 
        ON locais_voto USING GIST (localizacao);

    CREATE INDEX IF NOT EXISTS idx_visitas_terreno_geom 
        ON visitas_terreno USING GIST (localizacao);

    CREATE INDEX IF NOT EXISTS idx_atas_apuramento_geom 
        ON atas_apuramento USING GIST (localizacao_envio);

    -- 2. Índice GIN para busca instantânea de carências (Dores Prioritárias)
    CREATE INDEX IF NOT EXISTS idx_visitas_dores_gin 
        ON visitas_terreno USING GIN (dores_prioritarias);

    -- 3. Índices Compostos B-Tree de Alta Performance
    CREATE INDEX IF NOT EXISTS idx_visitas_campanha_tempo 
        ON visitas_terreno (campanha_id, registado_em DESC);

    CREATE INDEX IF NOT EXISTS idx_visitas_ativista_tempo 
        ON visitas_terreno (ativista_id, registado_em DESC);

    CREATE INDEX IF NOT EXISTS idx_locais_voto_prov_muni 
        ON locais_voto (provincia, municipio, zonamento_historico);

    -- 4. Trigger de Auditoria Espacial de Atas no Dia D (Alerta para Revisão Humana)
    CREATE OR REPLACE FUNCTION trg_auditar_distancia_ata()
    RETURNS TRIGGER AS $$
    DECLARE
        v_local_assembleia GEOGRAPHY;
        v_distancia_calculada NUMERIC(8,2);
    BEGIN
        SELECT localizacao INTO v_local_assembleia
        FROM locais_voto
        WHERE id = NEW.local_voto_id;

        IF v_local_assembleia IS NOT NULL THEN
            v_distancia_calculada := ST_Distance(NEW.localizacao_envio, v_local_assembleia);
            NEW.distancia_assembleia_metros := v_distancia_calculada;

            -- Geofencing: Se > 300 metros, gera ALERTA PARA REVISÃO HUMANA (sem acusação precipitada)
            IF v_distancia_calculada > 300.0 THEN
                NEW.status := 'SUSPEITA';
                NEW.motivo_auditoria := 'Submissão a ' || ROUND(v_distancia_calculada, 1) || 'm da assembleia (raio tolerado: 300m). Encaminhado para revisão humana.';
            ELSE
                IF NEW.status = 'SUSPEITA' AND NEW.motivo_auditoria IS NULL THEN
                    NEW.status := 'PENDENTE';
                END IF;
            END IF;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_verificar_geofence_ata ON atas_apuramento;
    CREATE TRIGGER trg_verificar_geofence_ata
    BEFORE INSERT OR UPDATE ON atas_apuramento
    FOR EACH ROW
    EXECUTE FUNCTION trg_auditar_distancia_ata();

    -- 5. Stored Procedure para busca de assembleias em raio métrico
    CREATE OR REPLACE FUNCTION fn_buscar_locais_voto_proximos(
        p_longitude DOUBLE PRECISION,
        p_latitude DOUBLE PRECISION,
        p_raio_metros DOUBLE PRECISION DEFAULT 2000.0,
        p_limite INT DEFAULT 50
    )
    RETURNS TABLE (
        id UUID,
        nome VARCHAR,
        provincia VARCHAR,
        municipio VARCHAR,
        total_eleitores_aptos INT,
        zonamento_historico tipo_zonamento,
        distancia_metros DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        latitude DOUBLE PRECISION
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT 
            lv.id,
            lv.nome,
            lv.provincia,
            lv.municipio,
            lv.total_eleitores_aptos,
            lv.zonamento_historico,
            ST_Distance(lv.localizacao, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography) AS distancia_metros,
            ST_X(lv.localizacao::geometry) AS longitude,
            ST_Y(lv.localizacao::geometry) AS latitude
        FROM locais_voto lv
        WHERE ST_DWithin(
            lv.localizacao,
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
            p_raio_metros
        )
        ORDER BY distancia_metros ASC
        LIMIT p_limite;
    END;
    $$ LANGUAGE plpgsql STABLE;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP FUNCTION IF EXISTS fn_buscar_locais_voto_proximos;
    DROP TRIGGER IF EXISTS trg_verificar_geofence_ata ON atas_apuramento;
    DROP FUNCTION IF EXISTS trg_auditar_distancia_ata;
    DROP INDEX IF EXISTS idx_locais_voto_prov_muni;
    DROP INDEX IF EXISTS idx_visitas_ativista_tempo;
    DROP INDEX IF EXISTS idx_visitas_campanha_tempo;
    DROP INDEX IF EXISTS idx_visitas_dores_gin;
    DROP INDEX IF EXISTS idx_atas_apuramento_geom;
    DROP INDEX IF EXISTS idx_visitas_terreno_geom;
    DROP INDEX IF EXISTS idx_locais_voto_geom;
  `);
};
