"""Central async SQLite database wrapper following ASAAS Backend Foundation."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncIterator

import aiosqlite

from config import settings

logger = logging.getLogger(__name__)


class Database:
    _path: str = settings.database_path

    @classmethod
    def configure(cls, path: str) -> None:
        cls._path = path

    @classmethod
    async def initialize(cls) -> None:
        db_file = Path(cls._path)
        db_file.parent.mkdir(parents=True, exist_ok=True)
        async with aiosqlite.connect(cls._path) as connection:
            await connection.execute("PRAGMA journal_mode = WAL")
            await connection.execute("PRAGMA synchronous = NORMAL")
            await connection.execute("PRAGMA foreign_keys = ON")
            await connection.execute("PRAGMA busy_timeout = 5000")
            await connection.commit()
        logger.info("SQLite database initialized at %s", cls._path)

    @classmethod
    @asynccontextmanager
    async def connection(cls) -> AsyncIterator[aiosqlite.Connection]:
        async with aiosqlite.connect(cls._path) as connection:
            connection.row_factory = aiosqlite.Row
            await connection.execute("PRAGMA foreign_keys = ON")
            await connection.execute("PRAGMA busy_timeout = 5000")
            yield connection

    @classmethod
    async def execute(cls, query: str, params: tuple[Any, ...] = ()) -> int:
        async with cls.connection() as connection:
            cursor = await connection.execute(query, params)
            await connection.commit()
            return cursor.lastrowid or 0

    @classmethod
    async def fetch_one(
        cls,
        query: str,
        params: tuple[Any, ...] = (),
    ) -> dict[str, Any] | None:
        async with cls.connection() as connection:
            cursor = await connection.execute(query, params)
            row = await cursor.fetchone()
            return dict(row) if row else None

    @classmethod
    async def fetch_all(
        cls,
        query: str,
        params: tuple[Any, ...] = (),
    ) -> list[dict[str, Any]]:
        async with cls.connection() as connection:
            cursor = await connection.execute(query, params)
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
