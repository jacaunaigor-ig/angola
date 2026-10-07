from typing import Annotated

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..demo import DEMO_USER, credenciais_de_demonstracao
from ..schemas import LoginRequest
from ..security import create_access_token, current_user

router = APIRouter(prefix="/api/auth", tags=["authentication"])


def _token_payload(user: dict, request: Request) -> dict:
    token = create_access_token(user, request.app.state.settings)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": request.app.state.settings.jwt_access_token_expire_minutes * 60,
        "campanha_id": str(user["campanha_id"]),
        "ativista_id": str(user["ativista_id"]) if user.get("ativista_id") else None,
    }


def _utilizador_na_base(request: Request, payload: LoginRequest):
    pool = getattr(request.app.state, "db_pool", None)
    if pool is None:
        return None
    with pool.connection() as connection:
        return connection.execute(
            """
            SELECT id, campanha_id, ativista_id, nome, email, senha_hash, perfil, ativo
            FROM usuarios
            WHERE campanha_id = %s AND lower(email) = lower(%s)
            """,
            (payload.campaign_id, payload.email),
        ).fetchone()


@router.post("/token")
def issue_token(payload: LoginRequest, request: Request):
    settings = request.app.state.settings
    user = _utilizador_na_base(request, payload)
    if user and user["ativo"] and bcrypt.checkpw(
        payload.password.encode("utf-8"), user["senha_hash"].encode("utf-8")
    ):
        return _token_payload(user, request)

    if settings.app_env != "production" and credenciais_de_demonstracao(
        payload.campaign_id, payload.email, payload.password
    ):
        return _token_payload(DEMO_USER, request)

    if getattr(request.app.state, "db_pool", None) is None:
        if payload.email.strip().lower() == DEMO_USER["email"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "A base de dados não está ligada. Use as credenciais de demonstração "
                "ou continue em consulta CNE."
            ),
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas.",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.get("/me")
def get_current_user(user: Annotated[dict, Depends(current_user)]):
    return {
        "id": user["sub"],
        "campanha_id": user["campaign_id"],
        "email": user.get("email"),
        "perfil": user["perfil"],
    }
