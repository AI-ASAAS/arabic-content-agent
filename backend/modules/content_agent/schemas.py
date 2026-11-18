"""Pydantic request, response, and structured LLM output schemas for the Content Agent."""

from typing import Literal

from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    brand_name: str = Field(min_length=1, max_length=160)
    platform: str = Field(min_length=1, max_length=160)
    dialect: str = Field(min_length=1, max_length=160)
    target_audience: str = Field(min_length=1, max_length=200)
    topic: str = Field(min_length=3, max_length=2000)
    target_seconds: int = Field(default=60, ge=10, le=300)
    variants_count: int = Field(default=3, ge=1, le=5)
    enable_reflexion: bool = True

    # Optional per-request provider settings (when configured from UI modal)
    base_url: str | None = Field(default=None, max_length=300)
    api_key: str | None = Field(default=None, max_length=300)
    model: str | None = Field(default=None, max_length=160)
    max_tokens: int | None = Field(default=None, ge=150, le=8000)


class EvaluationResult(BaseModel):
    """Structured output contract returned by the Reflexion Evaluator LLM."""

    tone_score: int = Field(ge=1, le=10)
    verbal_feedback: str = Field(min_length=3, max_length=700)
    is_passed: bool
    violations: list[str] = Field(default_factory=list, max_length=8)


class ScriptItem(BaseModel):
    id: str
    title: str
    badge: str
    content: str
    words_count: int
    reading_seconds: int


class AgentStepTrace(BaseModel):
    step: int
    name: str
    status: Literal["done", "skipped", "retried", "failed"]
    detail: str
    duration_ms: int = 0


class GenerateResponse(BaseModel):
    run_id: int
    session_id: str
    posts: list[ScriptItem]
    score: int = Field(ge=1, le=10)
    feedback: str
    used_model: str
    prompt_version: str
    iterations: int
    stop_reason: str
    tools_used: list[str]
    reasoning_tokens: int | None = None
    latency_ms: int
    trace: list[AgentStepTrace]


class TestConnectionRequest(BaseModel):
    base_url: str | None = Field(default=None, max_length=300)
    api_key: str | None = Field(default=None, max_length=300)
    model: str = Field(min_length=1, max_length=160)


class TestConnectionResponse(BaseModel):
    success: bool
    latency_ms: int
    model: str
    message: str


class AssistantHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class AssistantRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[AssistantHistoryItem] = Field(default_factory=list, max_length=12)
    base_url: str | None = Field(default=None, max_length=300)
    api_key: str | None = Field(default=None, max_length=300)
    model: str | None = Field(default=None, max_length=160)


class AssistantResponse(BaseModel):
    reply: str
    used_model: str
    prompt_version: str


class AgentRunSummary(BaseModel):
    id: int
    session_id: str
    brand_name: str
    platform: str
    topic: str
    target_seconds: int
    variants_count: int
    used_model: str
    tone_score: int
    iterations: int
    stop_reason: str
    latency_ms: int
    created_at: str


class AgentRunDetail(AgentRunSummary):
    dialect: str
    target_audience: str
    prompt_version: str
    evaluator_feedback: str
    tools_used: list[str]
    posts: list[ScriptItem]
    trace: list[AgentStepTrace]


class ArchitectureNode(BaseModel):
    step: int
    name: str
    component: str
    skill_ref: str
    description: str


class ArchitectureResponse(BaseModel):
    engine: str
    architecture_style: str
    skills_source: str
    skills_applied: list[str]
    prompts: dict[str, str]
    tools: list[dict[str, str]]
    guardrails: dict[str, str | int]
    pipeline: list[ArchitectureNode]
