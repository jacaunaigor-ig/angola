"""Applies the ordered SQL migrations to a newly provisioned Render database."""

import logging
import re
from pathlib import Path

import psycopg
from app.settings import get_settings

DATABASE_DIR = Path(__file__).resolve().parents[1] / "database"
LOGGER = logging.getLogger(__name__)


def migration_files(directory: Path = DATABASE_DIR) -> list[Path]:
    return sorted(directory.glob("[0-9][0-9]_*.sql"))


def without_transaction_wrappers(sql: str) -> str:
    sql = re.sub(r"(?m)^[ \t]*BEGIN;[ \t]*(?:\r?\n|$)", "", sql)
    return re.sub(r"(?m)^[ \t]*COMMIT;[ \t]*(?:\r?\n|$)", "", sql)


def apply_migrations(
    connection: psycopg.Connection,
    directory: Path = DATABASE_DIR,
) -> None:
    migrations = migration_files(directory)
    if not migrations:
        raise FileNotFoundError(f"Nenhuma migration SQL encontrada em {directory}.")

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    for migration in migrations:
        applied = connection.execute(
            "SELECT 1 FROM schema_migrations WHERE filename = %s",
            (migration.name,),
        ).fetchone()
        if applied:
            continue

        sql = without_transaction_wrappers(migration.read_text(encoding="utf-8"))
        try:
            with connection.transaction():
                connection.execute(sql, prepare=False)
                connection.execute(
                    "INSERT INTO schema_migrations (filename) VALUES (%s)",
                    (migration.name,),
                )
        except psycopg.Error as exc:
            raise RuntimeError(f"Falha ao aplicar migration {migration.name}.") from exc
        LOGGER.info("Migração aplicada: %s", migration.name)


def main() -> None:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())
    with psycopg.connect(
        settings.database_url,
        connect_timeout=settings.database_connect_timeout,
        autocommit=True,
    ) as connection:
        connection.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        connection.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
        apply_migrations(connection)


if __name__ == "__main__":
    main()
