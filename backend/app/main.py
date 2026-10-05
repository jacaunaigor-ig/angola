import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from psycopg_pool import ConnectionPool

from .database import create_pool
from .observability import configure_observability, logger, request_logging_middleware
from .routers import auth, health, legacy, plans, visits, whatsapp
from .settings import Settings, get_settings


def create_app(settings: Settings | None = None, pool: ConnectionPool | None = None) -> FastAPI:
    configured = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        active_pool = pool or create_pool(
            configured.database_url,
            configured.database_pool_min_size,
            configured.database_pool_max_size,
        )
        app.state.db_pool = active_pool
        db_ready = False
        try:
            active_pool.open(wait=True, timeout=configured.database_connect_timeout)
            with active_pool.connection() as connection:
                connection.execute("SELECT 1").fetchone()
            db_ready = True
        except Exception:
            logger.exception(
                "PostgreSQL indisponível. Cartografia, série histórica e planos continuam; rotas de campanha não."
            )
            try:
                active_pool.close()
            except Exception:
                pass
            app.state.db_pool = None
        app.state.db_ready = db_ready
        try:
            yield
        finally:
            if db_ready:
                active_pool.close()

    application = FastAPI(
        title=configured.app_name,
        version="3.0.0",
        debug=configured.debug,
        lifespan=lifespan,
    )
    application.state.settings = configured
    application.state.logger = logger
    application.state.rate_limit_windows = {}
    application.state.request_duration, application.state.request_errors = configure_observability(
        configured.otel_exporter_otlp_endpoint
    )
    application.dependency_overrides[get_settings] = lambda: configured
    if pool is not None:
        application.state.db_pool = pool

    application.add_middleware(
        CORSMiddleware,
        allow_origins=configured.cors_origins,
        allow_credentials=configured.cors_allow_credentials,
        allow_methods=configured.cors_methods,
        allow_headers=configured.cors_headers,
        expose_headers=["X-Request-ID"],
    )
    application.middleware("http")(request_logging_middleware)

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            headers={"X-Request-ID": getattr(request.state, "request_id", "")},
            content={
                "sucesso": False,
                "erro": "Payload inválido.",
                "detalhes": exc.errors(),
                "request_id": getattr(request.state, "request_id", None),
            },
        )

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logging.getLogger("angola.api").exception("Unhandled application exception")
        return JSONResponse(
            status_code=500,
            headers={"X-Request-ID": getattr(request.state, "request_id", "")},
            content={
                "sucesso": False,
                "erro": "Erro interno da API.",
                "request_id": getattr(request.state, "request_id", None),
            },
        )

    application.include_router(health.router)
    application.include_router(auth.router)
    application.include_router(plans.router)
    application.include_router(visits.router)
    application.include_router(legacy.router)
    application.include_router(whatsapp.router)
    return application


app = create_app()
