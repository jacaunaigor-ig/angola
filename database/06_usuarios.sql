BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ativistas_id_campanha
    ON ativistas (id, campanha_id);

CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
    ativista_id UUID,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(254) NOT NULL,
    senha_hash TEXT NOT NULL,
    perfil VARCHAR(20) NOT NULL
        CHECK (perfil IN ('ADMIN', 'ANALISTA', 'COORDENADOR', 'BRIGADISTA', 'LEITOR')),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT fk_usuario_ativista_campanha
        FOREIGN KEY (ativista_id, campanha_id)
        REFERENCES ativistas (id, campanha_id) ON DELETE RESTRICT,
    CONSTRAINT uq_usuario_ativista UNIQUE (ativista_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_campanha_email
    ON usuarios (campanha_id, lower(email));

COMMIT;
