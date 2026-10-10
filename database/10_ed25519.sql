-- ==============================================================================
-- MIGRATION 10: CADEIA PROBATÓRIA ED25519 NAS ATAS DE APURAMENTO
-- Guarda a assinatura e a chave pública do delegado após validação na API,
-- para auditoria judicial posterior (não só verificação em memória no pedido).
-- ==============================================================================

ALTER TABLE IF EXISTS atas_apuramento
    ADD COLUMN IF NOT EXISTS dados_hash_sha256 CHAR(64);

ALTER TABLE IF EXISTS atas_apuramento
    ADD COLUMN IF NOT EXISTS assinatura_ed25519 VARCHAR(128);

ALTER TABLE IF EXISTS atas_apuramento
    ADD COLUMN IF NOT EXISTS chave_publica_ed25519 VARCHAR(64);

COMMENT ON COLUMN atas_apuramento.assinatura_ed25519 IS
    'Assinatura Ed25519 destacada (64 bytes em hex) do digest canónico da ata, validada pela API.';
COMMENT ON COLUMN atas_apuramento.chave_publica_ed25519 IS
    'Chave pública Ed25519 (32 bytes em hex) do delegado de lista, extraída do SecureStore do aparelho.';
COMMENT ON COLUMN atas_apuramento.dados_hash_sha256 IS
    'SHA-256 do digest canónico (mesa, votos, hash da foto, instante e coordenadas).';

CREATE INDEX IF NOT EXISTS idx_atas_assinatura_ed25519
    ON atas_apuramento (campanha_id, registado_em DESC)
    WHERE assinatura_ed25519 IS NOT NULL;
