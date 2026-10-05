from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .settings import Settings, get_settings

bearer_scheme = HTTPBearer(auto_error=False)
ALLOWED_ROLES = {"ADMIN", "ANALISTA", "COORDENADOR", "BRIGADISTA", "LEITOR"}


def create_access_token(user: dict, settings: Settings) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user["id"]),
            "email": user["email"],
            "campaign_id": str(user["campanha_id"]),
            "ativista_id": str(user["ativista_id"]) if user.get("ativista_id") else None,
            "perfil": user["perfil"],
            "iat": now,
            "exp": now + timedelta(minutes=settings.jwt_access_token_expire_minutes),
            "iss": settings.jwt_issuer,
        },
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticação Bearer obrigatória.")
    try:
        claims = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            issuer=settings.jwt_issuer,
            options={"require": ["sub", "campaign_id", "perfil", "exp", "iss"]},
        )
        claims["sub"] = str(UUID(claims["sub"]))
        claims["campaign_id"] = str(UUID(claims["campaign_id"]))
        if claims["perfil"] not in ALLOWED_ROLES:
            raise ValueError("Perfil não reconhecido.")
        return claims
    except (jwt.PyJWTError, ValueError, KeyError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado.") from exc


def require_roles(*roles: str):
    allowed = set(roles)

    def guard(user: Annotated[dict, Depends(current_user)]) -> dict:
        if user["perfil"] not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Perfil sem permissão para esta operação.")
        return user

    return guard
