# LLM Integration

Use this reference before adding or changing any model call: the provider client, structured output, prompts, timeouts, budgets, streaming and logging. The code below runs as written (tested with FastAPI, httpx and pydantic-settings); adapt names to the project.

## Contents

- One provider client
- Settings and wiring
- Structured output
- Prompts
- Budgets and limits
- Streaming
- Logging and privacy

## One provider client

Every model call goes through one module, `modules/llm/client.py`. It talks to any OpenAI-compatible endpoint (OpenRouter by default), so changing provider or model is a settings change. It owns:

- a timeout on every request (set on the shared `httpx.AsyncClient`);
- bounded retries with backoff on rate limits, server errors and network failures;
- a fallback list of models, tried in order;
- no retry on a 400-class error (a bad request will fail again), but a move to the next model, which may support the option that failed;
- one log line per call with model, prompt version, latency, tokens and cost;
- `LLMError` when nothing worked, so the caller shows a retryable message instead of inventing an answer.

```python
# modules/llm/client.py
import asyncio
import logging
import time
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

RETRYABLE_STATUS = {408, 409, 425, 429, 500, 502, 503, 504}


class LLMError(Exception):
    """No usable answer: show the user a retryable message, never a made-up one."""


class LLMClient:
    """The only place that talks to the model provider (OpenAI-compatible API)."""

    def __init__(
        self,
        http: httpx.AsyncClient,
        models: list[str],
        extra_body: dict[str, Any] | None = None,
        attempts_per_model: int = 2,
        backoff_seconds: float = 0.5,
    ) -> None:
        self._http = http
        self._models = models  # preferred first, then fallbacks
        self._extra_body = extra_body or {}
        self._attempts = attempts_per_model
        self._backoff = backoff_seconds

    async def chat(
        self,
        messages: list[dict[str, Any]],
        *,
        prompt_version: str,
        max_tokens: int = 800,
        temperature: float = 0.2,
        **options: Any,  # tools, tool_choice, response_format …
    ) -> dict[str, Any]:
        """Returns the assistant message; raises LLMError when every model and retry failed."""
        for model in self._models:
            for attempt in range(self._attempts):
                body = {
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    **options,
                    **self._extra_body,
                }
                started = time.perf_counter()
                try:
                    response = await self._http.post("/chat/completions", json=body)
                except (httpx.TimeoutException, httpx.TransportError) as error:
                    logger.warning("llm transport error model=%s attempt=%s: %s", model, attempt, type(error).__name__)
                    await asyncio.sleep(self._backoff * 2**attempt)
                    continue
                if response.status_code in RETRYABLE_STATUS:
                    logger.warning("llm retryable status=%s model=%s attempt=%s", response.status_code, model, attempt)
                    await asyncio.sleep(self._backoff * 2**attempt)
                    continue
                if response.status_code >= 400:
                    # Bad request, auth or unsupported option: retrying the same model will not help.
                    logger.error("llm error status=%s model=%s body=%s", response.status_code, model, response.text[:300])
                    break
                data = response.json()
                usage = data.get("usage") or {}
                logger.info(
                    "llm ok model=%s prompt=%s ms=%d in=%s out=%s cost=%s",
                    data.get("model", model),
                    prompt_version,
                    (time.perf_counter() - started) * 1000,
                    usage.get("prompt_tokens"),
                    usage.get("completion_tokens"),
                    usage.get("cost"),
                )
                return data["choices"][0]["message"]
        raise LLMError("The AI service is unavailable right now. Please try again.")

    async def structured(
        self,
        messages: list[dict[str, Any]],
        schema: type[T],
        *,
        prompt_version: str,
        **options: Any,
    ) -> T:
        """Asks for JSON matching `schema`, validates it, and retries once with the validation error."""
        response_format = {
            "type": "json_schema",
            "json_schema": {"name": schema.__name__, "schema": schema.model_json_schema()},
        }
        conversation = list(messages)
        for _ in range(2):
            message = await self.chat(
                conversation, prompt_version=prompt_version, response_format=response_format, **options
            )
            content = _strip_fences(message.get("content") or "")
            try:
                return schema.model_validate_json(content)
            except ValidationError as error:
                logger.warning("llm output invalid prompt=%s errors=%s", prompt_version, error.error_count())
                conversation += [
                    {"role": "assistant", "content": content},
                    {
                        "role": "user",
                        "content": f"That reply did not match the required JSON schema:\n{error}\nReply again with the JSON object only.",
                    },
                ]
        raise LLMError("The AI answer could not be understood. Please try again.")


def _strip_fences(text: str) -> str:
    """Some models wrap JSON in ```json fences even when asked not to."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else ""
        text = text.rsplit("```", 1)[0]
    return text.strip()
```

## Settings and wiring

Model ids, keys and provider options live in settings, never in code. One `httpx.AsyncClient` is created in the lifespan and shared, and routes get the client through a dependency.

```python
# config.py, main.py and modules/llm/client.py (see below)
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import FastAPI, Request
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from modules.llm.client import LLMClient


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    llm_base_url: str = "https://openrouter.ai/api/v1"
    llm_api_key: SecretStr = SecretStr("")
    llm_models: list[str] = []  # LLM_MODELS='["primary/model", "fallback/model"]'
    llm_extra_body: dict[str, Any] = {"provider": {"data_collection": "deny"}}
    llm_timeout_seconds: float = 30


settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    http = httpx.AsyncClient(
        base_url=settings.llm_base_url,
        headers={"Authorization": f"Bearer {settings.llm_api_key.get_secret_value()}"},
        timeout=httpx.Timeout(settings.llm_timeout_seconds, connect=5),
    )
    app.state.llm = LLMClient(http, settings.llm_models, settings.llm_extra_body)
    yield
    await http.aclose()


def get_llm(request: Request) -> LLMClient:
    return request.app.state.llm
```

```env
LLM_API_KEY=...                     # never committed; .env.example lists the key without a value
LLM_MODELS=["provider/primary-model", "provider/fallback-model"]
```

In an ASAAS backend, put `Settings` fields in the project's `config.py`, the lifespan lines in `main.py`, and `get_llm` with the client in `modules/llm/`. Pick the models by running the feature's evaluation set (see `evaluation.md`), not by reputation.

`llm_extra_body` carries provider-specific options. The default denies OpenRouter data collection; when pointing at a provider that rejects unknown fields, set `LLM_EXTRA_BODY={}`.

## Structured output

Anything the application reads from a model (a category, extracted fields, a decision) is a Pydantic model, not free text:

```python
from typing import Literal

from pydantic import BaseModel, Field


class Triage(BaseModel):
    category: Literal["billing", "technical", "other"]
    urgent: bool
    summary: str = Field(max_length=200)


async def triage_message(llm: LLMClient, text: str) -> Triage:
    prompt, version = load_prompt("triage")
    return await llm.structured(
        [{"role": "system", "content": prompt}, {"role": "user", "content": text}],
        Triage,
        prompt_version=version,
        max_tokens=300,
        temperature=0,
    )
```

- `structured` sends the JSON schema, validates the reply, and on failure sends the validation error back once before raising `LLMError`. It also tolerates replies wrapped in Markdown fences.
- Choose a model that supports `response_format` with a JSON schema; validation still runs either way.
- Use `Literal` and `Field` constraints so the model cannot return a value the application does not handle.
- Business rules stay in the service: the model may say `urgent: true`, the service decides what happens to urgent tickets.

## Prompts

Prompts are files next to the code that uses them, with a version tag on the first line:

```text
prompts/triage.md
---------------------------------
version: triage@3
Classify the customer's message ...
```

```python
from pathlib import Path

PROMPTS = Path(__file__).parent / "prompts"


def load_prompt(name: str) -> tuple[str, str]:
    """Returns (text, version). The first line of prompts/<name>.md is `version: <tag>`."""
    first, _, text = (PROMPTS / f"{name}.md").read_text(encoding="utf-8").partition("\n")
    return text.strip(), first.removeprefix("version:").strip()
```

- Change the version tag whenever the prompt's meaning changes; it is logged with every call, so a quality change can be traced to a prompt change.
- Keep system prompts short. Put the product's glossary (its own terms and what they mean) in the system prompt rather than long instructions.
- Never put secrets, personal data or per-user permissions in a prompt file. Permissions are enforced in code.
- Run the feature's evaluation set before merging a prompt change.

## Budgets and limits

Set these on every user-facing feature, from the first version:

| Limit | Where | Starting point |
| --- | --- | --- |
| `max_tokens` per call | the call site | the longest good answer plus a margin |
| Conversation history | the service | last 8 messages (longer threads made models drift) |
| Input size | the request schema | `Field(max_length=...)` on user text |
| Requests per user | the router (dependency or middleware) | 60 per hour for an assistant |
| Request timeout | `llm_timeout_seconds` | 30 s, connect 5 s |

Review logged cost per request after the first real week, and lower the model tier where the evaluation set allows.

## Streaming

Return the whole answer by default; the `asaas-ui` assistant expects `{ reply, attachments }` in one response. Stream only when answers are long enough that waiting hurts, and then stream from the backend with `StreamingResponse` (server-sent events) while still validating any structured part after the stream ends.

## Logging and privacy

- Log model, prompt version, latency, tokens and cost for every call. Do not log full prompts or answers by default; when debugging needs them, log them only in development.
- Send the provider only what the task needs. Remove phone numbers, emails, national IDs and other fields the answer does not use before they reach the prompt or a tool result.
- Deny provider data collection (OpenRouter: `provider: {"data_collection": "deny"}`), and check the provider's retention terms before sending customer data.
- Treat everything the model returns as untrusted input: validate it, never execute it, and escape it when rendering.
