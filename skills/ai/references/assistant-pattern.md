# Assistant Pattern

Use this reference before building or changing an in-app assistant: a chat that answers questions about the user's own data in the product and can prepare actions. It records what worked in ASAAS's shipped assistant (the Asaas fund: `C:\ayoub\asaas accounting\apps\server\src`, `application/assistant/AskAssistant.ts`, `interfaces/assistant/tools.ts`, `infrastructure/ai/OpenRouterChatModel.ts`). The interface is the `asaas-ui` `AssistantWidget`; this file is the server side. The Python below runs as written with the client from `llm-integration.md`.

## Rules that came from real failures

- **The model reads through tools, never the database.** Each tool wraps the same use case as the HTTP API, with the same permission checks, and returns only the fields the question needs.
- **Writes are proposals.** A write tool validates its arguments and returns a proposal card; it never saves. The user presses «تأكيد», and that goes through the product's normal endpoint with its normal checks. The assistant itself cannot save, edit or delete.
- **Filter tools by role on the server.** A user who can only view is never offered write tools. A tool the model asks for that was not offered is refused.
- **Force a lookup on the first step** (`tool_choice: "required"`). Without it, models answered later questions from memory and invented names and numbers.
- **Short system prompt with a glossary** of the product's terms, plus a reminder right before the last message: answer that message only and re-fetch numbers.
- **One fixed refusal** for anything outside the product's scope.
- **Limits:** the last 8 messages, 1,500 characters per message, at most 5 tool steps, 60 questions per user per hour.
- **Privacy:** trim personal fields (phone numbers, emails) from tool results the answer does not need; deny provider data collection.

## Contract with the widget

```text
POST /api/assistant   (behind the normal session check)
request:  { "messages": [ { "role": "user" | "assistant", "content": "..." } ] }
response: { "reply": "...", "attachments": [ { "type": "proposal", ... } ] }
errors:   429 with Retry-After when over the limit; 503 when the model is unavailable
```

Only show the widget when the server has the assistant switched on (for example `GET /api/assistant/status`), so the robot never leads nowhere.

## Service

```python
# modules/assistant/service.py
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Literal

from pydantic import BaseModel, Field, ValidationError

from modules.llm.client import LLMClient

logger = logging.getLogger(__name__)

MAX_STEPS = 5
HISTORY_LIMIT = 8


class AssistantMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=1500)


class AskRequest(BaseModel):
    messages: list[AssistantMessage] = Field(min_length=1, max_length=40)


class AskResponse(BaseModel):
    reply: str
    attachments: list[dict[str, Any]] = []


@dataclass
class Tool:
    name: str
    description: str
    parameters: type[BaseModel]
    run: Callable[[Any, Any], Awaitable[dict[str, Any]]]  # (user, args) -> trimmed result
    writes: bool = False  # write tools only validate and return a proposal
    roles: set[str] = field(default_factory=lambda: {"viewer", "editor", "admin"})

    def spec(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters.model_json_schema(),
            },
        }


class AssistantService:
    def __init__(self, llm: LLMClient, tools: list[Tool], system_prompt: str, prompt_version: str) -> None:
        self._llm = llm
        self._tools = tools
        self._system = system_prompt
        self._version = prompt_version

    async def ask(self, user: Any, request: AskRequest) -> AskResponse:
        # Permissions are decided here, before the model sees anything.
        allowed = {t.name: t for t in self._tools if user.role in t.roles}
        history = [m.model_dump() for m in request.messages[-HISTORY_LIMIT:]]
        reminder = {"role": "system", "content": "Answer the last message only. Re-fetch any numbers with the tools."}
        messages: list[dict[str, Any]] = [{"role": "system", "content": self._system}, *history[:-1], reminder, history[-1]]
        attachments: list[dict[str, Any]] = []

        for step in range(MAX_STEPS):
            reply = await self._llm.chat(
                messages,
                prompt_version=self._version,
                tools=[t.spec() for t in allowed.values()],
                # Force a lookup first: without it models answered from memory and invented names.
                tool_choice="required" if step == 0 and allowed else "auto",
                max_tokens=700,
            )
            calls = reply.get("tool_calls") or []
            if not calls:
                return AskResponse(reply=reply.get("content") or "", attachments=attachments)

            messages.append({"role": "assistant", "content": reply.get("content"), "tool_calls": calls})
            for call in calls:
                result = await self._run_tool(user, allowed, call, attachments)
                messages.append({"role": "tool", "tool_call_id": call["id"], "content": json.dumps(result, ensure_ascii=False)})

        logger.warning("assistant stopped after %s steps prompt=%s", MAX_STEPS, self._version)
        return AskResponse(reply="I could not finish that request. Please ask it in a simpler way.", attachments=attachments)

    async def _run_tool(self, user: Any, allowed: dict[str, Tool], call: dict[str, Any], attachments: list) -> dict[str, Any]:
        name = call["function"]["name"]
        tool = allowed.get(name)
        if tool is None:  # the model asked for a tool this user does not have
            return {"error": f"Tool {name} is not available."}
        try:
            args = tool.parameters.model_validate_json(call["function"]["arguments"] or "{}")
        except ValidationError as error:
            return {"error": "Invalid arguments", "details": error.errors(include_url=False)}
        try:
            result = await tool.run(user, args)
        except Exception:
            logger.exception("assistant tool failed tool=%s", name)
            return {"error": "The tool failed. Tell the user to try again later."}
        if tool.writes:
            # A proposal card for the interface; the user confirms it through the normal endpoint.
            attachments.append({"type": "proposal", "tool": name, **result})
            return {"status": "proposal shown to the user; nothing has been saved"}
        return result
```

Tools are defined next to the use cases they wrap, so they share the same permission checks:

```python
class PaymentArgs(BaseModel):
    member_id: int
    amount: int = Field(gt=0)


async def propose_payment(user, args: PaymentArgs) -> dict:
    member = await MemberService(...).get_visible(user, args.member_id)  # same checks as the API
    return {"member_id": member["id"], "member_name": member["name"], "amount": args.amount}


TOOLS = [
    Tool("get_balance", "Current fund balance", NoArgs, get_balance),
    Tool("record_payment", "Prepare a payment for the user to confirm", PaymentArgs,
         propose_payment, writes=True, roles={"editor", "admin"}),
]
```

## Router and rate limit

```python
# utils/rate_limit.py
import time
from collections import defaultdict, deque

from fastapi import HTTPException, status


class RateLimiter:
    """In-memory sliding window per key. Fine for one app instance; use the database or Redis for several."""

    def __init__(self, limit: int, window_seconds: float) -> None:
        self._limit = limit
        self._window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > self._window:
            hits.popleft()
        if len(hits) >= self._limit:
            retry_after = int(self._window - (now - hits[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many questions. Please wait and try again.",
                headers={"Retry-After": str(retry_after)},
            )
        hits.append(now)
```

```python
# modules/assistant/router.py
assistant_limit = RateLimiter(limit=60, window_seconds=3600)

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("", response_model=AskResponse)
async def ask(body: AskRequest, user=Depends(require_user), llm: LLMClient = Depends(get_llm)) -> AskResponse:
    assistant_limit.check(f"assistant:{user.id}")
    system_prompt, version = load_prompt("assistant")
    service = AssistantService(llm, TOOLS, system_prompt, version)
    try:
        return await service.ask(user, body)
    except LLMError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
```

`require_user` is the project's session dependency. Behaviour checked with a mock provider: an editor is offered both tools and gets a proposal attachment while the model is told nothing was saved; a viewer is offered only the read tool and a forced write call is refused; invalid arguments return an error to the model; the loop stops after five steps; over the limit returns 429; a provider outage returns 503; an oversized message returns 422.

## Evaluate before shipping

Build the assistant's evaluation set (see `evaluation.md`) from real questions: lookups, comparisons, questions about other users the person may not see, out-of-scope requests, and write requests from each role. Check the tool chosen, the numbers in the reply against the database, refusals, and that no proposal appears for a viewer.
