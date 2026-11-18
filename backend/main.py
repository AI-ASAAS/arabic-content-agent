"""FastAPI entrypoint for the ASAAS Vibe-Coded Arabic Content Agent."""

import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from config import settings
from database import Database
from migrations.runner import run_migrations
from modules.content_agent.router import router as content_agent_router
from modules.llm.client import LLMClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await Database.initialize()
    await run_migrations()

    http = httpx.AsyncClient(
        timeout=httpx.Timeout(settings.llm_timeout_seconds, connect=10.0),
    )
    app.state.llm = LLMClient(
        http=http,
        models=settings.llm_models,
        extra_body=settings.llm_extra_body,
        attempts_per_model=settings.llm_attempts_per_model,
        backoff_seconds=settings.llm_backoff_seconds,
        default_base_url=settings.llm_base_url,
        default_api_key=settings.llm_api_key.get_secret_value(),
        timeout_seconds=settings.llm_timeout_seconds,
    )
    logger.info(
        "%s v%s started (Vibe-Coded FastAPI Agent | Zero n8n)",
        settings.app_name,
        settings.app_version,
    )
    yield
    await http.aclose()
    logger.info("Backend HTTP client closed cleanly")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="ASAAS Vibe-Coded Arabic Content Agent powered by FastAPI, Pydantic, SQLite & AI-ASAAS Skills",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, error: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        {"message": str(error.detail)},
        status_code=error.status_code,
        headers=error.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, error: RequestValidationError) -> JSONResponse:
    first = error.errors()[0]
    field = ".".join(str(part) for part in first["loc"][1:])
    msg = f"{field}: {first['msg']}" if field else first["msg"]
    return JSONResponse({"message": msg}, status_code=422)


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "engine": "ASAAS Vibe-Coded FastAPI Agent",
        "version": settings.app_version,
        "skills": "https://github.com/AI-ASAAS/skills",
    }


app.include_router(content_agent_router)
