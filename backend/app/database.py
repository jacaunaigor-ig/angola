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


def get_connection(request: Request) -> Iterator:
    pool: ConnectionPool = request.app.state.db_pool
    with pool.connection() as connection:
        yield connection
