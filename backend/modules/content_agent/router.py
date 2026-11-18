"""Thin FastAPI router for the ASAAS Vibe-Coded Content Agent."""

import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from config import settings
from modules.content_agent.schemas import (
    AgentRunDetail,
    AgentRunSummary,
    ArchitectureResponse,
    AssistantRequest,
    AssistantResponse,
    GenerateRequest,
    GenerateResponse,
    TestConnectionRequest,
    TestConnectionResponse,
)
from modules.content_agent.service import ContentAgentService
from modules.llm.client import LLMClient, LLMError, get_llm

router = APIRouter(prefix="/api/agent", tags=["Content Agent"])

# Simple bounded in-memory sliding-window rate limiter (ASAAS AI Skill: 60 req/hr per caller)
_request_timestamps: dict[str, deque[float]] = defaultdict(deque)
_WINDOW_SECONDS = 3600.0


def enforce_rate_limit(request: Request) -> None:
    caller = request.client.host if request.client else "local"
    now = time.monotonic()
    bucket = _request_timestamps[caller]
    while bucket and (now - bucket[0]) > _WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= settings.agent_rate_limit_per_hour:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="تم تجاوز الحد المسموح من الطلبات في الساعة. يرجى المحاولة لاحقاً.",
        )
    bucket.append(now)


def get_service(llm: LLMClient = Depends(get_llm)) -> ContentAgentService:
    return ContentAgentService(llm)


@router.get("/architecture", response_model=ArchitectureResponse)
async def get_architecture(
    service: ContentAgentService = Depends(get_service),
) -> ArchitectureResponse:
    return service.get_architecture()


@router.post("/generate", response_model=GenerateResponse)
async def generate_content(
    body: GenerateRequest,
    _: None = Depends(enforce_rate_limit),
    service: ContentAgentService = Depends(get_service),
) -> GenerateResponse:
    try:
        return await service.generate(body)
    except LLMError as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error))


@router.post("/generate/stream")
async def generate_content_stream(
    body: GenerateRequest,
    _: None = Depends(enforce_rate_limit),
    service: ContentAgentService = Depends(get_service),
) -> StreamingResponse:
    return StreamingResponse(
        service.generate_stream(body),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/test-connection", response_model=TestConnectionResponse)
async def test_connection(
    body: TestConnectionRequest,
    service: ContentAgentService = Depends(get_service),
) -> TestConnectionResponse:
    return await service.test_connection(body)


@router.post("/assistant", response_model=AssistantResponse)
async def assistant_chat(
    body: AssistantRequest,
    _: None = Depends(enforce_rate_limit),
    service: ContentAgentService = Depends(get_service),
) -> AssistantResponse:
    try:
        return await service.chat_assistant(body)
    except LLMError as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error))


@router.get("/runs", response_model=list[AgentRunSummary])
async def list_runs(
    limit: int = 20,
    service: ContentAgentService = Depends(get_service),
) -> list[AgentRunSummary]:
    return await service.list_runs(limit=limit)


@router.get("/runs/{run_id}", response_model=AgentRunDetail)
async def get_run(
    run_id: int,
    service: ContentAgentService = Depends(get_service),
) -> AgentRunDetail:
    run = await service.get_run(run_id)
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="لم يتم العثور على سجل التشغيل المطلوب.",
        )
    return run
