"""Módulo de Assinatura Digital e Cadeia de Custódia Probatória (Ed25519).

Conforme as melhores práticas de integridade de apuramento eleitoral e auditoria:
- Cada fiscal/delegado de lista possui um par de chaves assimétricas Ed25519 gerado
  localmente no telemóvel e armazenado no SecureStore/Keystore do dispositivo.
- A ata de apuramento é assinada digitalmente de forma destacada (detached signature).
- A assinatura vincula os dados apurados (votos favoráveis, oponentes, nulos, brancos, mesa),
  a geolocalização do envio, o timestamp e o hash SHA-256 da fotografia da ata física.
- Isso impede que atas sejam forjadas ou alteradas em trânsito e confere valor jurídico.
"""

from __future__ import annotations

import binascii
from typing import Any, Dict, Optional, Tuple
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric import ed25519


def montar_digest_canonico_ata(
    local_voto_id: str,
    mesa_numero: int,
    votos_favoraveis: int,
    votos_oponentes: int,
    votos_nulos: int,
    votos_brancos: int,
    total_votantes: int,
    foto_hash_sha256: str,
    registado_em: str,
    longitude: Optional[float] = None,
    latitude: Optional[float] = None,
) -> bytes:
    """Monta a sequência canônica determinística para assinatura criptográfica da ata."""
    lon_str = f"{float(longitude):.6f}" if longitude is not None else "0.000000"
    lat_str = f"{float(latitude):.6f}" if latitude is not None else "0.000000"
    
    elementos = [
        str(local_voto_id).strip().lower(),
        str(int(mesa_numero)),
        str(int(votos_favoraveis)),
        str(int(votos_oponentes)),
        str(int(votos_nulos)),
        str(int(votos_brancos)),
        str(int(total_votantes)),
        str(foto_hash_sha256).strip().lower(),
        str(registado_em).strip(),
        lon_str,
        lat_str,
    ]
    texto_canonico = "|".join(elementos)
    return texto_canonico.encode("utf-8")


def verificar_assinatura_ed25519(
    chave_publica_hex: str,
    assinatura_hex: str,
    mensagem_bytes: bytes,
) -> bool:
    """Valida se a assinatura Ed25519 (64 bytes hex) confere com a chave pública (32 bytes hex)."""
    try:
        pub_bytes = bytes.fromhex(chave_publica_hex.strip())
        sig_bytes = bytes.fromhex(assinatura_hex.strip())
        if len(pub_bytes) != 32 or len(sig_bytes) != 64:
            return False
        
        public_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
        public_key.verify(sig_bytes, mensagem_bytes)
        return True
    except (ValueError, binascii.Error, InvalidSignature):
        return False


def gerar_par_chaves_ed25519() -> Tuple[str, str]:
    """Gera um novo par de chaves Ed25519 retornando (chave_privada_hex, chave_publica_hex)."""
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    
    priv_hex = private_key.private_bytes_raw().hex()
    pub_hex = public_key.public_bytes_raw().hex()
    return priv_hex, pub_hex


def assinar_mensagem_ed25519(
    chave_privada_hex: str,
    mensagem_bytes: bytes,
) -> str:
    """Assina uma mensagem com chave privada Ed25519 retornando a assinatura em hex (128 chars)."""
    priv_bytes = bytes.fromhex(chave_privada_hex.strip())
    private_key = ed25519.Ed25519PrivateKey.from_private_bytes(priv_bytes)
    assinatura = private_key.sign(mensagem_bytes)
    return assinatura.hex()
