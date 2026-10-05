"""Armazenamento de evidências desacoplado do PostgreSQL.

O ticket de envio é assinado com HMAC-SHA256 (chave da API) e expira. Em produção a
mesma interface pode ser trocada por URLs pré-assinadas S3/R2 sem mudar os clientes.
"""

from __future__ import annotations

import hashlib
import hmac
import time
from pathlib import Path

from fastapi import HTTPException

STORAGE_ROOT = Path(__file__).resolve().parents[2] / "data" / "storage"
TICKET_TTL_SECONDS = 900
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_PREFIXES = ("atas/", "visitas/")


def _mac(secret: str, storage_key: str, expires: int) -> str:
    message = f"{storage_key}|{expires}".encode()
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def sign_upload_ticket(secret: str, storage_key: str, ttl: int = TICKET_TTL_SECONDS) -> tuple[int, str]:
    expires = int(time.time()) + ttl
    return expires, _mac(secret, storage_key, expires)


def verify_upload_ticket(secret: str, storage_key: str, expires: int, signature: str) -> None:
    if expires < int(time.time()):
        raise HTTPException(status_code=403, detail="Ticket de envio expirado.")
    if not hmac.compare_digest(_mac(secret, storage_key, expires), signature or ""):
        raise HTTPException(status_code=403, detail="Ticket de envio inválido.")


def resolve_storage_path(storage_key: str) -> Path:
    """Resolve a chave para um caminho dentro de STORAGE_ROOT ou recusa."""
    if not storage_key.startswith(ALLOWED_PREFIXES) or "\\" in storage_key or "\x00" in storage_key:
        raise HTTPException(status_code=400, detail="Caminho de arquivo inválido.")
    root = STORAGE_ROOT.resolve()
    destino = (root / storage_key).resolve()
    if root not in destino.parents:
        raise HTTPException(status_code=400, detail="Caminho de arquivo inválido.")
    return destino


def campaign_of_key(storage_key: str) -> str | None:
    partes = storage_key.split("/")
    return partes[1] if len(partes) >= 3 else None
