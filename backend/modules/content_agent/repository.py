"""SQLite persistence repository for content agent runs (ASAAS Backend Foundation)."""

import json
from typing import Any, TypedDict

from database import Database


class AgentRunRecord(TypedDict):
    id: int
    session_id: str
    brand_name: str
    platform: str
    dialect: str
    target_audience: str
    topic: str
    target_seconds: int
    variants_count: int
    used_model: str
    prompt_version: str
    iterations: int
    tone_score: int
    stop_reason: str
    evaluator_feedback: str
    tools_used_json: str
    posts_json: str
    trace_json: str
    latency_ms: int
    created_at: str


class ContentAgentRepository:
    @staticmethod
    async def save_run(
        *,
        session_id: str,
        brand_name: str,
        platform: str,
        dialect: str,
        target_audience: str,
        topic: str,
        target_seconds: int,
        variants_count: int,
        used_model: str,
        prompt_version: str,
        iterations: int,
        tone_score: int,
        stop_reason: str,
        evaluator_feedback: str,
        tools_used: list[str],
        posts: list[dict[str, Any]],
        trace: list[dict[str, Any]],
        latency_ms: int,
    ) -> int:
        return await Database.execute(
            """
            INSERT INTO agent_runs (
                session_id, brand_name, platform, dialect, target_audience, topic,
                target_seconds, variants_count, used_model, prompt_version,
                iterations, tone_score, stop_reason, evaluator_feedback,
                tools_used_json, posts_json, trace_json, latency_ms
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                brand_name,
                platform,
                dialect,
                target_audience,
                topic,
                target_seconds,
                variants_count,
                used_model,
                prompt_version,
                iterations,
                tone_score,
                stop_reason,
                evaluator_feedback,
                json.dumps(tools_used, ensure_ascii=False),
                json.dumps(posts, ensure_ascii=False),
                json.dumps(trace, ensure_ascii=False),
                latency_ms,
            ),
        )

    @staticmethod
    async def list_recent_runs(limit: int = 20) -> list[dict[str, Any]]:
        safe_limit = max(1, min(limit, 100))
        return await Database.fetch_all(
            """
            SELECT
                id, session_id, brand_name, platform, topic,
                target_seconds, variants_count, used_model,
                tone_score, iterations, stop_reason, latency_ms, created_at
            FROM agent_runs
            ORDER BY id DESC
            LIMIT ?
            """,
            (safe_limit,),
        )

    @staticmethod
    async def get_run_by_id(run_id: int) -> AgentRunRecord | None:
        row = await Database.fetch_one(
            """
            SELECT
                id, session_id, brand_name, platform, dialect, target_audience,
                topic, target_seconds, variants_count, used_model, prompt_version,
                iterations, tone_score, stop_reason, evaluator_feedback,
                tools_used_json, posts_json, trace_json, latency_ms, created_at
            FROM agent_runs
            WHERE id = ?
            """,
            (run_id,),
        )
        if row is None:
            return None
        return AgentRunRecord(**row)

    @staticmethod
    async def get_approved_examples(platform: str, limit: int = 2) -> list[str]:
        """Read-only memory lookup: fetches recent high-scoring scripts for few-shot brand alignment."""
        rows = await Database.fetch_all(
            """
            SELECT posts_json
            FROM agent_runs
            WHERE tone_score >= 8 AND platform = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (platform, max(1, min(limit, 3))),
        )
        examples: list[str] = []
        for row in rows:
            try:
                posts = json.loads(row["posts_json"])
                if posts and isinstance(posts, list):
                    content = str(posts[0].get("content") or "").strip()
                    if content:
                        examples.append(content[:260])
            except Exception:
                continue
        return examples
