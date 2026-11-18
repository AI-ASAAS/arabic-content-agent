"""Ordered versioned SQLite migrations following ASAAS Backend Foundation."""

import logging

import aiosqlite

from database import Database

logger = logging.getLogger(__name__)


class Migration:
    version: int
    description: str

    @staticmethod
    async def up(connection: aiosqlite.Connection) -> None:
        raise NotImplementedError


class Migration001(Migration):
    version = 1
    description = "Create agent_runs table for persisting vibe-coded content agent executions"

    @staticmethod
    async def up(connection: aiosqlite.Connection) -> None:
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                brand_name TEXT NOT NULL,
                platform TEXT NOT NULL,
                dialect TEXT NOT NULL,
                target_audience TEXT NOT NULL,
                topic TEXT NOT NULL,
                target_seconds INTEGER NOT NULL,
                variants_count INTEGER NOT NULL,
                used_model TEXT NOT NULL,
                prompt_version TEXT NOT NULL,
                iterations INTEGER NOT NULL DEFAULT 1,
                tone_score INTEGER NOT NULL DEFAULT 0,
                stop_reason TEXT NOT NULL,
                evaluator_feedback TEXT NOT NULL DEFAULT '',
                tools_used_json TEXT NOT NULL DEFAULT '[]',
                posts_json TEXT NOT NULL DEFAULT '[]',
                trace_json TEXT NOT NULL DEFAULT '[]',
                latency_ms INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        await connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at
            ON agent_runs (created_at DESC)
            """
        )


MIGRATIONS: list[type[Migration]] = [Migration001]


async def run_migrations() -> None:
    async with Database.connection() as connection:
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                description TEXT NOT NULL,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        cursor = await connection.execute("SELECT version FROM schema_migrations")
        applied = {row["version"] for row in await cursor.fetchall()}

        for migration in sorted(MIGRATIONS, key=lambda m: m.version):
            if migration.version in applied:
                continue
            logger.info("Applying migration %03d: %s", migration.version, migration.description)
            await migration.up(connection)
            await connection.execute(
                "INSERT INTO schema_migrations (version, description) VALUES (?, ?)",
                (migration.version, migration.description),
            )
            await connection.commit()
