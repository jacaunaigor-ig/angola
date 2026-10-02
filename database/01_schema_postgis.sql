-- ==============================================================================
-- PROJETO: GPS DE GEOMARKETING POLÍTICO - ANGOLA 2027
-- MÓDULO 1: ARQUITETURA DA BASE DE DADOS (POSTGRESQL + POSTGIS)
-- ==============================================================================

-- 1. EXTENSÕES OBRIGATÓRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. DOMÍNIOS E TIPOS ENUMERADOS (TAXONOMIA ELEITORAL ANGOLANA)
DO $$ BEGIN
    CREATE TYPE tipo_zonamento AS ENUM ('BASTIAO', 'CAMPO_BATALHA', 'OPOSICAO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_sentimento AS ENUM ('POSITIVO', 'NEUTRO', 'NEGATIVO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE categoria_dor AS ENUM (
        'AGUA',
        'ENERGIA',
        'EMPREGO',
        'SANEAMENTO',
        'SAUDE',
        'EDUCACAO',
        'ESTRADAS',
        'HABITACAO',
        'SEGURANCA'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cargo_ativista AS ENUM (
        'COORDENADOR_PROVINCIAL',
        'COORDENADOR_MUNICIPAL',
        'BRIGADISTA_TERRENO',
        'DELEGADO_LISTA'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_ata AS ENUM ('PENDENTE', 'VALIDADA', 'SUSPEITA', 'REJEITADA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. GESTÃO MULTI-TENANCY B2B (CAMPANHAS / PARTIDOS)
CREATE TABLE IF NOT EXISTS campanhas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    partido_coligacao VARCHAR(100) NOT NULL,
    eleicao_ano SMALLINT NOT NULL DEFAULT 2027,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 4. LOCAIS DE VOTO (ASSEMBLEIAS DE VOTO - CNE ANGOLA)
CREATE TABLE IF NOT EXISTS locais_voto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_cne VARCHAR(50) UNIQUE,
    nome VARCHAR(255) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    comuna_distrito VARCHAR(100),
    bairro_aldeia VARCHAR(100),
    total_mesas INT NOT NULL DEFAULT 1 CHECK (total_mesas >= 1),
    total_eleitores_aptos INT NOT NULL DEFAULT 0 CHECK (total_eleitores_aptos >= 0),
    zonamento_historico tipo_zonamento NOT NULL DEFAULT 'CAMPO_BATALHA',
    -- Armazenamos como GEOGRAPHY para medições esféricas exatas em metros via SRID 4326
    localizacao GEOGRAPHY(Point, 4326) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 5. ATIVISTAS E EQUIPAS DE TERRENO
CREATE TABLE IF NOT EXISTS ativistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(50) NOT NULL,
    cargo cargo_ativista NOT NULL DEFAULT 'BRIGADISTA_TERRENO',
    device_id VARCHAR(120), -- Identificador único do dispositivo para rastreio e revogação
    local_voto_atribuido_id UUID REFERENCES locais_voto(id) ON DELETE SET NULL, -- Delegados do Dia D
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uk_ativista_campanha_telefone UNIQUE (campanha_id, telefone)
);

-- 6. VISITAS DE TERRENO (PORTA-A-PORTA OFFLINE-FIRST)
CREATE TABLE IF NOT EXISTS visitas_terreno (
    -- ID obrigatoriamente gerado como UUIDv4 no dispositivo mobile em modo offline
    id UUID PRIMARY KEY,
    uuid UUID UNIQUE,
    campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
    ativista_id UUID NOT NULL REFERENCES ativistas(id) ON DELETE RESTRICT,
    localizacao GEOGRAPHY(Point, 4326) NOT NULL,
    precisao_gps_metros NUMERIC(6,2) CHECK (precisao_gps_metros >= 0),
    sentimento tipo_sentimento NOT NULL,
    dores_prioritarias categoria_dor[] NOT NULL DEFAULT '{}',
    faixa_etaria VARCHAR(20) CHECK (faixa_etaria IN ('18-24', '25-35', '36-50', '50+')),
    eleitor_jovem BOOLEAN GENERATED ALWAYS AS (faixa_etaria IN ('18-24', '25-35')) STORED,
    observacoes TEXT,
    categoria_observacao VARCHAR(100),
    marcado_revisao_humana BOOLEAN NOT NULL DEFAULT FALSE,
    motivo_revisao VARCHAR(200),
    justificativa_offline TEXT,
    status_validacao VARCHAR(30) NOT NULL DEFAULT 'VALIDO',
    -- Timestamps críticos para auditoria offline:
    registado_em TIMESTAMPTZ NOT NULL, -- Hora local gravada pelo telemóvel sem internet
    sincronizado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), -- Hora da sincronização com a API
    sincronizado BOOLEAN NOT NULL DEFAULT TRUE,
    metadados_aparelho JSONB, -- Ex: {"os": "android", "app_version": "1.0.4", "battery": 78}
    criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_visita_tempo_plausivel CHECK (registado_em <= clock_timestamp() + INTERVAL '1 hour')
);

-- 7. PAINEL DO DIA D: SUBMISSÃO DE ATAS DE APURAMENTO E AFLUÊNCIA
CREATE TABLE IF NOT EXISTS atas_apuramento (
    id UUID PRIMARY KEY, -- Gerado no telemóvel do delegado
    campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
    local_voto_id UUID NOT NULL REFERENCES locais_voto(id) ON DELETE RESTRICT,
    mesa_numero INT NOT NULL CHECK (mesa_numero >= 1),
    delegado_id UUID NOT NULL REFERENCES ativistas(id) ON DELETE RESTRICT,
    votos_favoraveis INT NOT NULL CHECK (votos_favoraveis >= 0),
    votos_oponentes INT NOT NULL CHECK (votos_oponentes >= 0),
    votos_nulos INT NOT NULL DEFAULT 0 CHECK (votos_nulos >= 0),
    votos_brancos INT NOT NULL DEFAULT 0 CHECK (votos_brancos >= 0),
    total_votantes INT NOT NULL CHECK (total_votantes >= 0),
    foto_ata_url TEXT NOT NULL,
    foto_hash_sha256 CHAR(64) NOT NULL,
    localizacao_envio GEOGRAPHY(Point, 4326) NOT NULL,
    distancia_assembleia_metros NUMERIC(8,2), -- Preenchido automaticamente por trigger
    status status_ata NOT NULL DEFAULT 'PENDENTE',
    registado_em TIMESTAMPTZ NOT NULL,
    sincronizado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uk_ata_mesa UNIQUE (campanha_id, local_voto_id, mesa_numero)
);

-- ==============================================================================
-- 8. ÍNDICES ESPACIAIS E DE ALTA PERFORMANCE (GIST, GIN, B-TREE)
-- ==============================================================================

-- Índices Espaciais GiST (Otimizados para buscas geográficas por proximidade e contenção)
CREATE INDEX IF NOT EXISTS idx_locais_voto_geom 
    ON locais_voto USING GIST (localizacao);

CREATE INDEX IF NOT EXISTS idx_visitas_terreno_geom 
    ON visitas_terreno USING GIST (localizacao);

CREATE INDEX IF NOT EXISTS idx_atas_apuramento_geom 
    ON atas_apuramento USING GIST (localizacao_envio);

-- Índice GIN para busca instantânea e agregação de 'Dores Locais'
CREATE INDEX IF NOT EXISTS idx_visitas_dores_gin 
    ON visitas_terreno USING GIN (dores_prioritarias);

-- Índices B-Tree compostos para consultas comuns da API e Dashboard
CREATE INDEX IF NOT EXISTS idx_visitas_campanha_tempo 
    ON visitas_terreno (campanha_id, registado_em DESC);

CREATE INDEX IF NOT EXISTS idx_visitas_ativista_tempo 
    ON visitas_terreno (ativista_id, registado_em DESC);

CREATE INDEX IF NOT EXISTS idx_locais_voto_hierarquia 
    ON locais_voto (provincia, municipio, zonamento_historico);

-- ==============================================================================
-- 9. TRIGGERS DE SEGURANÇA E AUDITORIA ANTI-FRAUDE (DIA D)
-- ==============================================================================

-- Trigger para calcular a distância entre o delegado e a assembleia de voto no Dia D
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
        -- Mede a distância geodésica em metros
        v_distancia_calculada := ST_Distance(NEW.localizacao_envio, v_local_assembleia);
        NEW.distancia_assembleia_metros := v_distancia_calculada;

        -- Geofencing: Se a foto foi submetida a mais de 300 metros da assembleia, marca como SUSPEITA
        IF v_distancia_calculada > 300.0 THEN
            NEW.status := 'SUSPEITA';
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

-- ==============================================================================
-- 10. FUNÇÕES ESPACIAIS AUXILIARES (STORED PROCEDURES PARA A API)
-- ==============================================================================

-- Busca assembleias de voto dentro de um raio (em metros) a partir da coordenada do utilizador
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

-- ==============================================================================
-- 11. TRILHA DE AUDITORIA (ver também database/05_audit_logs.sql)
-- ==============================================================================
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
