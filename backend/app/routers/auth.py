from typing import Annotated

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..schemas import LoginRequest
from ..security import create_access_token, current_user

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/token")
def issue_token(payload: LoginRequest, request: Request):
    with request.app.state.db_pool.connection() as connection:
        user = connection.execute(
            """
            SELECT id, campanha_id, ativista_id, nome, email, senha_hash, perfil, ativo
            FROM usuarios
            WHERE campanha_id = %s AND lower(email) = lower(%s)
            """,
            (payload.campaign_id, payload.email),
        ).fetchone()

    if not user or not user["ativo"] or not bcrypt.checkpw(
        payload.password.encode("utf-8"), user["senha_hash"].encode("utf-8")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user, request.app.state.settings)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": request.app.state.settings.jwt_access_token_expire_minutes * 60,
        "campanha_id": str(user["campanha_id"]),
        "ativista_id": str(user["ativista_id"]) if user["ativista_id"] else None,
    }


@router.get("/me")
def get_current_user(user: Annotated[dict, Depends(current_user)]):
    return {
        "id": user["sub"],
        "campanha_id": user["campaign_id"],
        "email": user.get("email"),
        "perfil": user["perfil"],
    }
