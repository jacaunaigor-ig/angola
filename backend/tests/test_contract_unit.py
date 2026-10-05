from uuid import UUID

import jwt
import pytest

from app.main import create_app
from app.security import create_access_token
from app.settings import Settings


def test_cors_rejects_wildcard_origin():
    with pytest.raises(ValueError, match="wildcard não é permitido"):
        Settings(cors_allowed_origins="*")


def test_access_token_is_scoped_to_campaign_and_activist():
    settings = Settings(
        app_env="test",
        jwt_secret_key="a-long-test-secret-key-that-is-at-least-32-chars",
        cors_allowed_origins="http://localhost:3000",
    )
    token = create_access_token(
        {
            "id": UUID("d0000000-0000-0000-0000-000000000002"),
            "campanha_id": UUID("a0000000-0000-0000-0000-000000000001"),
            "ativista_id": UUID("b0000000-0000-0000-0000-000000000001"),
            "email": "field@example.test",
            "perfil": "BRIGADISTA",
        },
        settings,
    )
    claims = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        issuer=settings.jwt_issuer,
    )
    assert claims["campaign_id"] == "a0000000-0000-0000-0000-000000000001"
    assert claims["ativista_id"] == "b0000000-0000-0000-0000-000000000001"
    assert claims["perfil"] == "BRIGADISTA"


def test_fastapi_contract_registers_health_auth_and_legacy_routes():
    settings = Settings(
        app_env="test",
        jwt_secret_key="a-long-test-secret-key-that-is-at-least-32-chars",
        cors_allowed_origins="http://localhost:3000",
    )
    schema = create_app(settings).openapi()
    assert "/health/live" in schema["paths"]
    assert "/health/ready" in schema["paths"]
    assert "/api/auth/token" in schema["paths"]
    assert "/api/sincronizar-visitas" in schema["paths"]
