CREATE TABLE IF NOT EXISTS evidencias_visitas (
    id UUID PRIMARY KEY,
    campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
    visita_id UUID NOT NULL REFERENCES visitas_terreno(id) ON DELETE CASCADE,
    mime_type VARCHAR(40) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png')),
    sha256 CHAR(64) NOT NULL,
    nome_arquivo VARCHAR(180) NOT NULL,
    conteudo BYTEA NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_evidencias_visita ON evidencias_visitas(visita_id);
CREATE INDEX IF NOT EXISTS idx_evidencias_campanha ON evidencias_visitas(campanha_id);
