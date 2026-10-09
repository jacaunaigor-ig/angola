/**
 * Migration 003: Campanhas, Locais de Voto, Ativistas e Operação com Privacidade
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    -- 1. Gestão Multi-tenancy B2B de Campanhas
    CREATE TABLE IF NOT EXISTS campanhas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(150) NOT NULL,
        partido_coligacao VARCHAR(100) NOT NULL,
        rotulo_personalizado_partido VARCHAR(100) NOT NULL DEFAULT 'Nosso Partido / Coligação',
        rotulo_personalizado_oposicao VARCHAR(100) NOT NULL DEFAULT 'Oposição Consolidada',
        cor_primaria_hex VARCHAR(7) NOT NULL DEFAULT '#10B981',
        cor_secundaria_hex VARCHAR(7) NOT NULL DEFAULT '#38BDF8',
        eleicao_ano SMALLINT NOT NULL DEFAULT 2027,
        modo_demonstracao BOOLEAN NOT NULL DEFAULT FALSE,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );

    -- 2. Locais de Voto Oficiais (Assembleias CNE)
    CREATE TABLE IF NOT EXISTS locais_voto (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        codigo_cne VARCHAR(50) UNIQUE,
        nome VARCHAR(255) NOT NULL,
        provincia VARCHAR(100) NOT NULL,
        municipio VARCHAR(100) NOT NULL,
        comuna_distrito VARCHAR(100),
        bairro_aldeia VARCHAR(100),
        unidade_territorial_id UUID REFERENCES unidades_territoriais(id) ON DELETE SET NULL,
        total_mesas INT NOT NULL DEFAULT 1 CHECK (total_mesas >= 1),
        total_eleitores_aptos INT NOT NULL DEFAULT 0 CHECK (total_eleitores_aptos >= 0),
        zonamento_historico tipo_zonamento NOT NULL DEFAULT 'CAMPO_BATALHA',
        localizacao GEOGRAPHY(Point, 4326) NOT NULL,
        proveniencia proveniencia_dado NOT NULL DEFAULT 'OFICIAL',
        criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );

    -- 3. Ativistas e Brigadas de Terreno (Minimização e Identificador Anônimo)
    CREATE TABLE IF NOT EXISTS ativistas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
        codigo_anonimo_brigada VARCHAR(60) NOT NULL, -- Ex: 'BRIGADA-TALATONA-04', 'ATIVISTA-A19'
        nome_operacional VARCHAR(150) NOT NULL,
        telefone_hash_sha256 CHAR(64), -- Hash irreversível para prevenir identificação direta
        cargo cargo_ativista NOT NULL DEFAULT 'BRIGADISTA_TERRENO',
        device_token_hash CHAR(64),
        local_voto_atribuido_id UUID REFERENCES locais_voto(id) ON DELETE SET NULL,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );

    -- 4. Visitas de Terreno (Com Agregação Espacial e Minimização de Dados)
    CREATE TABLE IF NOT EXISTS visitas_terreno (
        id UUID PRIMARY KEY, -- Gerado no telemóvel via UUIDv4 offline
        campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
        ativista_id UUID NOT NULL REFERENCES ativistas(id) ON DELETE RESTRICT,
        unidade_territorial_id UUID REFERENCES unidades_territoriais(id) ON DELETE SET NULL,
        localizacao GEOGRAPHY(Point, 4326) NOT NULL, -- Coordenada com perturbação de privacidade (~100m)
        precisao_gps_metros NUMERIC(6,2),
        sentimento tipo_sentimento NOT NULL,
        dores_prioritarias categoria_dor[] NOT NULL DEFAULT '{}',
        faixa_etaria VARCHAR(20) CHECK (faixa_etaria IN ('18-24', '25-35', '36-50', '50+')),
        eleitor_jovem BOOLEAN GENERATED ALWAYS AS (faixa_etaria IN ('18-24', '25-35')) STORED,
        observacoes TEXT,
        categoria_observacao VARCHAR(100), -- Estruturada (ex: 'PEDIDO_MATERIAL', 'APOIO_CONFIRMADO')
        marcado_revisao_humana BOOLEAN NOT NULL DEFAULT FALSE,
        motivo_revisao VARCHAR(200),
        registado_em TIMESTAMPTZ NOT NULL,
        sincronizado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        sincronizado BOOLEAN NOT NULL DEFAULT TRUE,
        metadados_aparelho JSONB,
        proveniencia proveniencia_dado NOT NULL DEFAULT 'OFICIAL',
        criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT ck_visita_tempo_plausivel CHECK (registado_em <= clock_timestamp() + INTERVAL '1 hour')
    );

    -- 5. Atas de Apuramento e Cadeia de Custódia
    CREATE TABLE IF NOT EXISTS atas_apuramento (
        id UUID PRIMARY KEY,
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
        dados_hash_sha256 CHAR(64), -- Hash criptográfico da contagem combinada
        localizacao_envio GEOGRAPHY(Point, 4326) NOT NULL,
        distancia_assembleia_metros NUMERIC(8,2),
        status status_ata NOT NULL DEFAULT 'PENDENTE',
        motivo_auditoria TEXT,
        registado_em TIMESTAMPTZ NOT NULL,
        sincronizado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT uk_ata_mesa_campanha UNIQUE (campanha_id, local_voto_id, mesa_numero)
    );

    -- 6. Casos Jurídicos e Auditoria Eleitoral Estruturada
    CREATE TABLE IF NOT EXISTS casos_juridicos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
        ata_id UUID REFERENCES atas_apuramento(id) ON DELETE SET NULL,
        local_voto_id UUID REFERENCES locais_voto(id) ON DELETE SET NULL,
        titulo VARCHAR(200) NOT NULL,
        descricao_fato TEXT NOT NULL,
        tipo_irregularidade VARCHAR(100) NOT NULL, -- Ex: 'GEOFENCE_EXCEDIDO', 'DIVERGENCIA_SOMA', 'ATA_ILEGIVEL'
        prioridade VARCHAR(20) NOT NULL DEFAULT 'ALTA' CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE')),
        status_caso VARCHAR(30) NOT NULL DEFAULT 'ABERTO' CHECK (status_caso IN ('ABERTO', 'EM_ANALISE', 'IMPUGNACAO_SUBMETIDA', 'ARQUIVADO')),
        advogado_responsavel VARCHAR(150),
        anexos_urls TEXT[] DEFAULT '{}',
        criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS casos_juridicos CASCADE;
    DROP TABLE IF EXISTS atas_apuramento CASCADE;
    DROP TABLE IF EXISTS visitas_terreno CASCADE;
    DROP TABLE IF EXISTS ativistas CASCADE;
    DROP TABLE IF EXISTS locais_voto CASCADE;
    DROP TABLE IF EXISTS campanhas CASCADE;
  `);
};
