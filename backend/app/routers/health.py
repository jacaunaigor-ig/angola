from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from psycopg import Error

router = APIRouter(tags=["health"])


@router.get("/health/live")
def liveness():
    return {"status": "LIVE"}


@router.get("/health/ready")
def readiness(request: Request):
    try:
        with request.app.state.db_pool.connection() as connection:
            row = connection.execute(
                "SELECT 1 AS alive, PostGIS_Full_Version() AS postgis"
            ).fetchone()
        return {"status": "READY", "database": "CONNECTED", "postgis": row["postgis"]}
    except Error as exc:
        request.app.state.logger.error("Readiness check failed: %s", exc)
        return JSONResponse(
            status_code=503,
            content={"status": "NOT_READY", "database": "DISCONNECTED"},
        )


@router.get("/api/health")
def legacy_health(request: Request):
    response = readiness(request)
    if isinstance(response, JSONResponse):
        return JSONResponse(
            status_code=response.status_code,
            content={
                "status": "DEGRADADO",
                "versao_api": "3.0.0",
                "base_dados": "DESCONECTADA",
            },
        )
    return {
        "status": "ONLINE",
        "versao_api": "3.0.0",
        "ambiente": request.app.state.settings.app_env,
        "base_dados": "CONECTADA",
        "postgis": response["postgis"],
    }
