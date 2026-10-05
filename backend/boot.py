import logging

import psycopg
import uvicorn

from app.settings import get_settings


def main() -> None:
    settings = get_settings()
    try:
        with psycopg.connect(
            settings.database_url,
            connect_timeout=settings.database_connect_timeout,
        ) as connection:
            connection.execute("SELECT PostGIS_Full_Version()").fetchone()
    except psycopg.Error as exc:
        logging.basicConfig(level=logging.ERROR)
        logging.error("Boot interrompido: PostgreSQL/PostGIS indisponível: %s", exc)
        raise SystemExit(1) from exc

    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        log_level=settings.log_level.lower(),
        proxy_headers=True,
    )


if __name__ == "__main__":
    main()
