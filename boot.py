"""Validação de ambiente e inicialização segura da aplicação.

Este módulo deve ser executado antes do boot da API FastAPI para garantir:
- presença de variáveis críticas;
- formatos válidos das configurações;
- conectividade real com PostgreSQL;
- interrupção limpa com mensagens claras em caso de falha.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from dataclasses import dataclass

import psycopg
from dotenv import load_dotenv


# Carrega .env quando existir no diretório do projeto.
# Em produção, o ambiente real pode sobrescrever estes valores.
load_dotenv(dotenv_path='.env', override=False)


class BootValidationError(RuntimeError):
    """Erro de validação do processo de boot."""


@dataclass(frozen=True)
class RequiredVar:
    name: str
    description: str
    required: bool = True
    validator: callable | None = None


def _as_bool(value: str | None, *, field_name: str) -> bool:
    if value is None:
        raise BootValidationError(f"Variável obrigatória '{field_name}' não definida.")
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise BootValidationError(
        f"Variável '{field_name}' inválida: '{value}'. "
        "Use valores booleanos como true/false, 1/0, yes/no."
    )


def _as_int(value: str | None, *, field_name: str, minimum: int | None = None) -> int:
    if value is None:
        raise BootValidationError(f"Variável obrigatória '{field_name}' não definida.")
    try:
        parsed = int(str(value).strip())
    except (TypeError, ValueError) as exc:
        raise BootValidationError(
            f"Variável '{field_name}' inválida: '{value}'. Esperado inteiro."
        ) from exc
    if minimum is not None and parsed < minimum:
        raise BootValidationError(
            f"Variável '{field_name}' inválida: {parsed}. Valor mínimo permitido: {minimum}."
        )
    return parsed


def _validate_non_empty(value: str | None, *, field_name: str) -> str:
    if value is None or str(value).strip() == "":
        raise BootValidationError(f"Variável obrigatória '{field_name}' não pode estar vazia.")
    return str(value).strip()


def _validate_jwt_secret(value: str | None) -> str:
    secret = _validate_non_empty(value, field_name='JWT_SECRET_KEY')
    if len(secret) < 32:
        raise BootValidationError(
            "JWT_SECRET_KEY deve ter pelo menos 32 caracteres para segurança adequada."
        )
    return secret


def _validate_database_url(value: str | None) -> str:
    url = _validate_non_empty(value, field_name='DATABASE_URL')
    if not url.startswith(("postgresql://", "postgres://")):
        raise BootValidationError(
            "DATABASE_URL inválida. Use o formato: postgresql://user:password@host:port/dbname"
        )
    return url


def _validate_allowed_origins(value: str | None) -> list[str]:
    raw = _validate_non_empty(value, field_name='CORS_ALLOWED_ORIGINS')
    origins = [item.strip() for item in raw.split(',') if item.strip()]
    if not origins:
        raise BootValidationError("CORS_ALLOWED_ORIGINS não pode estar vazio.")
    return origins


def _build_required_variables() -> list[RequiredVar]:
    return [
        RequiredVar("APP_ENV", "Ambiente da aplicação", True, lambda v: _validate_non_empty(v, field_name='APP_ENV')),
        RequiredVar("APP_NAME", "Nome da aplicação", True, lambda v: _validate_non_empty(v, field_name='APP_NAME')),
        RequiredVar("JWT_SECRET_KEY", "Segredo do JWT", True, _validate_jwt_secret),
        RequiredVar("JWT_ALGORITHM", "Algoritmo do JWT", True, lambda v: _validate_non_empty(v, field_name='JWT_ALGORITHM')),
        RequiredVar("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "Expiração do access token", True, lambda v: _as_int(v, field_name='JWT_ACCESS_TOKEN_EXPIRE_MINUTES', minimum=1)),
        RequiredVar("DATABASE_URL", "URL de conexão do PostgreSQL", False, _validate_database_url),
        RequiredVar("DATABASE_HOST", "Host do PostgreSQL", False, lambda v: _validate_non_empty(v, field_name='DATABASE_HOST')),
        RequiredVar("DATABASE_PORT", "Porta do PostgreSQL", False, lambda v: _as_int(v, field_name='DATABASE_PORT', minimum=1)),
        RequiredVar("DATABASE_NAME", "Nome do banco PostgreSQL", False, lambda v: _validate_non_empty(v, field_name='DATABASE_NAME')),
        RequiredVar("DATABASE_USER", "Usuário do PostgreSQL", False, lambda v: _validate_non_empty(v, field_name='DATABASE_USER')),
        RequiredVar("DATABASE_PASSWORD", "Senha do PostgreSQL", False, lambda v: _validate_non_empty(v, field_name='DATABASE_PASSWORD')),
        RequiredVar("AI_PROVIDER", "Provedor de IA", True, lambda v: _validate_non_empty(v, field_name='AI_PROVIDER')),
        RequiredVar("AI_MODEL", "Modelo de IA", True, lambda v: _validate_non_empty(v, field_name='AI_MODEL')),
        RequiredVar("CORS_ALLOWED_ORIGINS", "Origins permitidas pelo CORS", True, _validate_allowed_origins),
        RequiredVar("RATE_LIMIT_ENABLED", "Rate limit habilitado", True, lambda v: _as_bool(v, field_name='RATE_LIMIT_ENABLED')),
        RequiredVar("RATE_LIMIT_PER_MINUTE", "Limite de requisições por minuto", True, lambda v: _as_int(v, field_name='RATE_LIMIT_PER_MINUTE', minimum=1)),
        RequiredVar("API_HOST", "Host da API", True, lambda v: _validate_non_empty(v, field_name='API_HOST')),
        RequiredVar("API_PORT", "Porta da API", True, lambda v: _as_int(v, field_name='API_PORT', minimum=1)),
    ]


def _resolve_database_url() -> str:
    """Resolve a URL de conexão do PostgreSQL a partir de DATABASE_URL ou dos campos individuais."""
    if os.getenv('DATABASE_URL'):
        return _validate_database_url(os.getenv('DATABASE_URL'))

    required_parts = [
        ('DATABASE_HOST', 'host'),
        ('DATABASE_PORT', 'port'),
        ('DATABASE_NAME', 'dbname'),
        ('DATABASE_USER', 'user'),
        ('DATABASE_PASSWORD', 'password'),
    ]

    values: dict[str, str] = {}
    for env_name, _ in required_parts:
        value = os.getenv(env_name)
        if value is None or str(value).strip() == '':
            raise BootValidationError(
                f"Variável obrigatória '{env_name}' não definida. "
                "Defina DATABASE_URL ou todas as variáveis do banco individualmente."
            )
        values[env_name] = str(value).strip()

    sslmode = os.getenv('DATABASE_SSLMODE', 'prefer')
    host = values['DATABASE_HOST']
    port = values['DATABASE_PORT']
    dbname = values['DATABASE_NAME']
    user = values['DATABASE_USER']
    password = values['DATABASE_PASSWORD']
    return (
        f"postgresql://{user}:{password}@{host}:{port}/{dbname}?sslmode={sslmode}"
    )


def validate_environment() -> dict[str, object]:
    """Valida que todas as variáveis críticas existam e tenham formato esperado."""
    errors: list[str] = []
    validated: dict[str, object] = {}

    for required_var in _build_required_variables():
        value = os.getenv(required_var.name)
        try:
            if value is None and required_var.required:
                raise BootValidationError(f"Variável obrigatória '{required_var.name}' não definida.")
            if value is None:
                continue
            validated[required_var.name] = required_var.validator(value) if required_var.validator else value
        except BootValidationError as exc:
            errors.append(str(exc))

    # Validação especial de DATABASE_URL/DATABASE_*
    try:
        database_url = _resolve_database_url()
        validated['DATABASE_URL'] = database_url
    except BootValidationError as exc:
        errors.append(str(exc))

    # Validação dependente para IA
    ai_provider = (os.getenv('AI_PROVIDER') or '').strip().lower()
    if ai_provider == 'anthropic' and not (os.getenv('ANTHROPIC_API_KEY') or '').strip():
        errors.append("ANTHROPIC_API_KEY deve ser informado quando AI_PROVIDER='anthropic'.")
    if ai_provider == 'openai' and not (os.getenv('OPENAI_API_KEY') or '').strip():
        errors.append("OPENAI_API_KEY deve ser informado quando AI_PROVIDER='openai'.")

    if errors:
        raise BootValidationError("\n- " + "\n- ".join(errors))

    return validated


def test_postgres_connectivity(database_url: str) -> None:
    """Entra em contato real com o PostgreSQL antes de permitir o boot."""
    try:
        with psycopg.connect(database_url, connect_timeout=5, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT 1;')
                result = cur.fetchone()
                if result is None or result[0] != 1:
                    raise BootValidationError(
                        "Conexão com PostgreSQL foi estabelecida, mas a validação de saúde falhou."
                    )
    except psycopg.Error as exc:
        raise BootValidationError(
            f"Não foi possível conectar ao PostgreSQL com DATABASE_URL fornecida. "
            f"Detalhes: {exc}"
        ) from exc
    except Exception as exc:
        raise BootValidationError(
            "Falha inesperada ao testar conectividade com PostgreSQL: "
            f"{exc}"
        ) from exc


def main() -> int:
    """Ponto de entrada do boot verificando ambiente e infraestrutura."""
    parser = argparse.ArgumentParser(description="Valida o ambiente e inicia a API FastAPI.")
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Executa apenas a validação de ambiente e conectividade com PostgreSQL.",
    )
    args = parser.parse_args()
    print("[boot] Iniciando validação do ambiente...")

    try:
        validated = validate_environment()
        database_url = str(validated.get('DATABASE_URL'))
        print("[boot] Variáveis críticas validadas com sucesso.")

        print("[boot] Testando conectividade com PostgreSQL...")
        test_postgres_connectivity(database_url)
        print("[boot] PostgreSQL disponível e respondeu corretamente.")

        print("[boot] Boot autorizado. Aplicação pronta para subir.")
        if args.check_only:
            return 0

        backend_path = str(Path(__file__).resolve().parent / "backend")
        if backend_path not in sys.path:
            sys.path.insert(0, backend_path)
        import uvicorn
        from app.settings import get_settings

        settings = get_settings()
        print(f"[boot] Iniciando FastAPI em {settings.api_host}:{settings.api_port}.")
        uvicorn.run(
            "app.main:app",
            host=settings.api_host,
            port=settings.api_port,
            log_level=settings.log_level.lower(),
            proxy_headers=True,
        )
        return 0

    except BootValidationError as exc:
        print("[boot] ERRO DE BOOT: inicialização interrompida por inconsistência de ambiente.", file=sys.stderr)
        print(f"[boot] {exc}", file=sys.stderr)
        print("[boot] Verifique o arquivo .env e as variáveis do ambiente antes de continuar.", file=sys.stderr)
        return 1

    except KeyboardInterrupt:
        print("[boot] Interrompido pelo usuário.", file=sys.stderr)
        return 130

    except Exception as exc:  # pragma: no cover - guard rail final
        print("[boot] Falha inesperada durante o boot.", file=sys.stderr)
        print(f"[boot] {exc}", file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
