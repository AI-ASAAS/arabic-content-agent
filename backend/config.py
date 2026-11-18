"""Environment-driven configuration for the ASAAS Vibe-Coded Content Agent backend."""

from pathlib import Path
from typing import Any

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(ROOT_DIR / ".env"), str(BACKEND_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ASAAS Arabic Content Agent"
    app_version: str = "2.0.0"
    environment: str = "production"
    backend_port: int = 8085
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5180",
            "http://127.0.0.1:5180",
            "http://localhost:3000",
            "http://localhost:80",
            "http://localhost",
        ]
    )

    # Persistence (ASAAS Backend Skill default: SQLite at data/app.db)
    database_path: str = str(BACKEND_DIR / "data" / "app.db")

    # LLM Provider Boundary (ASAAS AI Skill default: OpenRouter with data collection denied)
    llm_base_url: str = "https://openrouter.ai/api/v1"
    llm_api_key: SecretStr = SecretStr("")
    llm_models: list[str] = Field(
        default_factory=lambda: [
            "google/gemini-2.5-flash",
            "google/gemma-4-31b-it:free",
            "google/gemma-4-26b-a4b-it:free",
            "nvidia/nemotron-3-ultra-550b-a55b:free",
            "openrouter/free",
        ]
    )
    llm_extra_body: dict[str, Any] = Field(
        default_factory=lambda: {"provider": {"data_collection": "deny"}}
    )
    llm_timeout_seconds: float = 45.0
    llm_attempts_per_model: int = 2
    llm_backoff_seconds: float = 0.5

    # Agentic Execution Guardrails (ASAAS build-ai-agents Skill)
    agent_max_iterations: int = 2
    agent_quality_threshold: int = 8
    agent_max_tokens: int = 1200
    agent_rate_limit_per_hour: int = 60


settings = Settings()
