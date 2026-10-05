from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "angola-campaign-api"
    app_env: Literal["development", "test", "staging", "production"] = "development"
    debug: bool = False
    api_host: str = "0.0.0.0"
    api_port: int = Field(default=8000, ge=1, le=65535)

    database_url: str = "postgresql://postgres:postgres@localhost:5432/angola_geomarketing"
    database_connect_timeout: int = Field(default=5, ge=1, le=60)
    database_pool_min_size: int = Field(default=1, ge=1)
    database_pool_max_size: int = Field(default=10, ge=1)

    jwt_secret_key: str = "development-only-secret-change-before-deploy-000000"
    jwt_algorithm: Literal["HS256", "HS384", "HS512"] = "HS256"
    jwt_access_token_expire_minutes: int = Field(default=60, ge=1, le=1440)
    jwt_issuer: str = "angola-campaign"

    cors_allowed_origins: str = "http://localhost:3000,http://localhost:8501"
    cors_allow_credentials: bool = True
    cors_allow_methods: str = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    cors_allow_headers: str = "Authorization,Content-Type,X-Request-ID,Accept"
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = Field(default=120, ge=1, le=10000)

    anthropic_api_key: str | None = None
    ai_model: str = "claude-3-5-sonnet-20241022"
    log_level: str = "INFO"
    otel_exporter_otlp_endpoint: str | None = None

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("JWT_SECRET_KEY deve ter pelo menos 32 caracteres.")
        return value

    @field_validator("cors_allowed_origins")
    @classmethod
    def validate_cors_origins(cls, value: str) -> str:
        origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        if not origins or "*" in origins:
            raise ValueError("CORS_ALLOWED_ORIGINS deve conter origens explícitas; wildcard não é permitido.")
        for origin in origins:
            if not (origin.startswith("https://") or origin.startswith("http://localhost")
                    or origin.startswith("http://127.0.0.1")):
                raise ValueError(f"Origem CORS inválida ou não segura: {origin}")
            if origin.endswith("/"):
                raise ValueError("Origens CORS não devem terminar com '/'.")
        return ",".join(origins)

    @model_validator(mode="after")
    def validate_runtime_settings(self) -> "Settings":
        if self.database_pool_min_size > self.database_pool_max_size:
            raise ValueError("DATABASE_POOL_MIN_SIZE não pode exceder DATABASE_POOL_MAX_SIZE.")
        if self.app_env == "production" and self.jwt_secret_key.startswith("development-only"):
            raise ValueError("JWT_SECRET_KEY de desenvolvimento não pode ser usada em produção.")
        if not self.database_url.startswith(("postgresql://", "postgres://")):
            raise ValueError("DATABASE_URL deve usar o esquema postgresql://.")
        return self

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    @property
    def cors_methods(self) -> list[str]:
        return [method.strip().upper() for method in self.cors_allow_methods.split(",") if method.strip()]

    @property
    def cors_headers(self) -> list[str]:
        return [header.strip() for header in self.cors_allow_headers.split(",") if header.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
