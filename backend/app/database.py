from collections.abc import Iterator

from fastapi import Request
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool


def create_pool(database_url: str, min_size: int, max_size: int) -> ConnectionPool:
    return ConnectionPool(
        conninfo=database_url,
        min_size=min_size,
        max_size=max_size,
        timeout=5,
        kwargs={"row_factory": dict_row},
        open=False,
    )


def set_campaign_context(connection, campaign_id: str | None, is_local: bool = True) -> None:
    """Configura o identificador da campanha ativa na sessão para aplicação de Row-Level Security (RLS)."""
    if campaign_id:
        connection.execute(
            "SELECT set_config('app.current_campanha_id', %s, %s)",
            (str(campaign_id), is_local),
        )


def get_connection(request: Request) -> Iterator:
    pool: ConnectionPool = request.app.state.db_pool
    with pool.connection() as connection:
        yield connection

