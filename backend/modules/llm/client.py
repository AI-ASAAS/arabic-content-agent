"""Single OpenAI-compatible LLM provider boundary following ASAAS AI Foundation."""

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from typing import Any, AsyncIterator, TypeVar

import httpx
from fastapi import Request
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

RETRYABLE_STATUS = {408, 409, 425, 429, 500, 502, 503, 504}


class LLMError(Exception):
    """No usable answer: show the user a retryable message, never a made-up one."""


@dataclass
class LLMResult:
    content: str
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    reasoning_tokens: int | None = None
    cost: float | None = None
    latency_ms: int = 0


class LLMClient:
    """The only place that talks to the model provider (OpenAI-compatible API)."""

    def __init__(
        self,
        http: httpx.AsyncClient,
        models: list[str],
        extra_body: dict[str, Any] | None = None,
        attempts_per_model: int = 2,
        backoff_seconds: float = 0.5,
        default_base_url: str = "https://openrouter.ai/api/v1",
        default_api_key: str = "",
        timeout_seconds: float = 45.0,
    ) -> None:
        self._http = http
        self._models = models
        self._extra_body = extra_body or {}
        self._attempts = attempts_per_model
        self._backoff = backoff_seconds
        self._default_base_url = default_base_url.rstrip("/")
        self._default_api_key = default_api_key
        self._timeout_seconds = timeout_seconds

    def _resolve_endpoint(
        self,
        base_url: str | None,
        api_key: str | None,
    ) -> tuple[str, dict[str, str], dict[str, Any]]:
        target_base = (base_url or self._default_base_url).strip().rstrip("/")
        if target_base.endswith("/chat/completions"):
            url = target_base
        else:
            url = f"{target_base}/chat/completions"

        key = (api_key if api_key is not None and api_key.strip() else self._default_api_key).strip()
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if key:
            headers["Authorization"] = f"Bearer {key}"

        is_openrouter = "openrouter.ai" in target_base.lower()
        if is_openrouter:
            headers["HTTP-Referer"] = "https://github.com/AI-ASAAS/arabic-content-agent"
            headers["X-Title"] = "ASAAS Arabic Content Agent"
            extra = dict(self._extra_body)
        else:
            # Avoid sending OpenRouter-only fields to OpenAI/Gemini/Groq/Ollama endpoints
            extra = {}

        return url, headers, extra

    def _resolve_models(self, preferred_model: str | None, base_url: str | None) -> list[str]:
        candidates: list[str] = []
        if preferred_model and preferred_model.strip():
            candidates.append(preferred_model.strip())
        # Only append OpenRouter fallbacks when talking to OpenRouter
        target_base = (base_url or self._default_base_url).lower()
        if "openrouter.ai" in target_base:
            for model in self._models:
                if model not in candidates:
                    candidates.append(model)
        elif not candidates and self._models:
            candidates.append(self._models[0])
        return candidates

    async def chat(
        self,
        messages: list[dict[str, Any]],
        *,
        prompt_version: str,
        max_tokens: int = 1000,
        temperature: float = 0.4,
        base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        **options: Any,
    ) -> LLMResult:
        """Returns LLMResult; raises LLMError when every model and retry fails."""
        url, headers, extra = self._resolve_endpoint(base_url, api_key)
        models = self._resolve_models(model, base_url)
        if not models:
            raise LLMError("لم يتم تحديد نموذج ذكاء اصطناعي صالح في الإعدادات.")

        last_error_detail = "خدمة الذكاء الاصطناعي غير متاحة حالياً. يرجى المحاولة مرة أخرى."
        for candidate_model in models:
            for attempt in range(self._attempts):
                body: dict[str, Any] = {
                    "model": candidate_model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    **options,
                    **extra,
                }
                started = time.perf_counter()
                try:
                    response = await self._http.post(
                        url,
                        json=body,
                        headers=headers,
                        timeout=httpx.Timeout(self._timeout_seconds, connect=10.0),
                    )
                except (httpx.TimeoutException, httpx.TransportError) as error:
                    logger.warning(
                        "llm transport error model=%s prompt=%s attempt=%s err=%s",
                        candidate_model,
                        prompt_version,
                        attempt,
                        type(error).__name__,
                    )
                    last_error_detail = f"تعذر الاتصال بمزود النموذج ({type(error).__name__})."
                    await asyncio.sleep(self._backoff * (2**attempt))
                    continue

                if response.status_code in RETRYABLE_STATUS:
                    logger.warning(
                        "llm retryable status=%s model=%s prompt=%s attempt=%s",
                        response.status_code,
                        candidate_model,
                        prompt_version,
                        attempt,
                    )
                    last_error_detail = f"مزود النموذج مشغول حالياً (HTTP {response.status_code})."
                    await asyncio.sleep(self._backoff * (2**attempt))
                    continue

                if response.status_code >= 400:
                    err_snippet = _extract_provider_error(response)
                    logger.error(
                        "llm error status=%s model=%s prompt=%s detail=%s",
                        response.status_code,
                        candidate_model,
                        prompt_version,
                        err_snippet[:240],
                    )
                    last_error_detail = f"رفض المزود الطلب (HTTP {response.status_code}): {err_snippet[:180]}"
                    if response.status_code in (401, 403):
                        raise LLMError(
                            f"مفتاح API غير صالح أو لا يملك الصلاحية (HTTP {response.status_code}). تحقق من إعدادات API."
                        )
                    # Try next fallback model if available (e.g. 402 credits or unsupported option)
                    break

                data = response.json()
                usage = data.get("usage") or {}
                elapsed_ms = int((time.perf_counter() - started) * 1000)
                used_model = data.get("model") or candidate_model
                reasoning_tokens = (usage.get("completion_tokens_details") or {}).get("reasoning_tokens")
                logger.info(
                    "llm ok model=%s prompt=%s ms=%d in=%s out=%s cost=%s",
                    used_model,
                    prompt_version,
                    elapsed_ms,
                    usage.get("prompt_tokens"),
                    usage.get("completion_tokens"),
                    usage.get("cost"),
                )
                content = ((data.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
                return LLMResult(
                    content=content,
                    model=used_model,
                    prompt_tokens=usage.get("prompt_tokens"),
                    completion_tokens=usage.get("completion_tokens"),
                    reasoning_tokens=reasoning_tokens,
                    cost=usage.get("cost"),
                    latency_ms=elapsed_ms,
                )

        raise LLMError(last_error_detail)

    async def stream_chat(
        self,
        messages: list[dict[str, Any]],
        *,
        prompt_version: str,
        max_tokens: int = 1000,
        temperature: float = 0.5,
        base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
    ) -> AsyncIterator[tuple[str, str]]:
        """Yields (delta_text, used_model) chunks from an OpenAI-compatible SSE stream."""
        url, headers, extra = self._resolve_endpoint(base_url, api_key)
        models = self._resolve_models(model, base_url)
        if not models:
            raise LLMError("لم يتم تحديد نموذج ذكاء اصطناعي صالح في الإعدادات.")

        last_error = "تعذر البث المباشر من مزود الذكاء الاصطناعي."
        for candidate_model in models:
            body: dict[str, Any] = {
                "model": candidate_model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "stream": True,
                **extra,
            }
            started = time.perf_counter()
            try:
                async with self._http.stream(
                    "POST",
                    url,
                    json=body,
                    headers=headers,
                    timeout=httpx.Timeout(self._timeout_seconds, connect=10.0),
                ) as response:
                    if response.status_code in (401, 403):
                        await response.aread()
                        raise LLMError(
                            f"مفتاح API غير صالح أو غير مصرح به (HTTP {response.status_code}). تحقق من الإعدادات."
                        )
                    if response.status_code >= 400:
                        await response.aread()
                        snippet = _extract_provider_error(response)
                        logger.warning(
                            "llm stream error status=%s model=%s prompt=%s detail=%s",
                            response.status_code,
                            candidate_model,
                            prompt_version,
                            snippet[:200],
                        )
                        last_error = f"فشل البث (HTTP {response.status_code}): {snippet[:180]}"
                        continue

                    used_model = candidate_model
                    yielded_any = False
                    async for raw_line in response.aiter_lines():
                        line = raw_line.strip()
                        if not line.startswith("data:"):
                            continue
                        payload_str = line[5:].strip()
                        if payload_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(payload_str)
                        except json.JSONDecodeError:
                            continue
                        if chunk.get("model"):
                            used_model = chunk["model"]
                        delta = ((chunk.get("choices") or [{}])[0].get("delta") or {}).get("content")
                        if delta:
                            yielded_any = True
                            yield delta, used_model

                    elapsed_ms = int((time.perf_counter() - started) * 1000)
                    logger.info(
                        "llm stream ok model=%s prompt=%s ms=%d",
                        used_model,
                        prompt_version,
                        elapsed_ms,
                    )
                    if yielded_any:
                        return
            except LLMError:
                raise
            except (httpx.TimeoutException, httpx.TransportError) as error:
                logger.warning(
                    "llm stream transport error model=%s prompt=%s err=%s",
                    candidate_model,
                    prompt_version,
                    type(error).__name__,
                )
                last_error = f"انقطع الاتصال أثناء البث المباشر ({type(error).__name__})."
                continue

        raise LLMError(last_error)

    async def structured(
        self,
        messages: list[dict[str, Any]],
        schema: type[T],
        *,
        prompt_version: str,
        max_tokens: int = 500,
        temperature: float = 0.0,
        base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
    ) -> tuple[T, LLMResult]:
        """Requests JSON matching `schema`, validates with Pydantic, and retries once on validation error."""
        schema_json = json.dumps(schema.model_json_schema(), ensure_ascii=False)
        conversation = list(messages)
        conversation.append(
            {
                "role": "system",
                "content": f"أجب حصراً بكائن JSON صالح يطابق هذا المخطط بدون أي نص إضافي:\n{schema_json}",
            }
        )

        last_result: LLMResult | None = None
        for _ in range(2):
            result = await self.chat(
                conversation,
                prompt_version=prompt_version,
                max_tokens=max_tokens,
                temperature=temperature,
                base_url=base_url,
                api_key=api_key,
                model=model,
            )
            last_result = result
            cleaned = _extract_json_object(_strip_fences(result.content))
            try:
                parsed = schema.model_validate_json(cleaned)
                return parsed, result
            except ValidationError as error:
                logger.warning(
                    "llm structured invalid prompt=%s errors=%s",
                    prompt_version,
                    error.error_count(),
                )
                conversation.extend(
                    [
                        {"role": "assistant", "content": result.content},
                        {
                            "role": "user",
                            "content": (
                                f"الإجابة لم تطابق مخطط JSON المطلوب:\n{error}\n"
                                "أعد الإرسال ككائن JSON صالح فقط بدون شرح أو علامات."
                            ),
                        },
                    ]
                )

        raise LLMError("لم نتمكن من قراءة مخرجات التقييم المهيكلة من النموذج. يرجى المحاولة مرة أخرى.")


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else ""
        text = text.rsplit("```", 1)[0]
    return text.strip()


def _extract_json_object(text: str) -> str:
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    return text


def _extract_provider_error(response: httpx.Response) -> str:
    try:
        data = response.json()
        err = data.get("error")
        if isinstance(err, dict):
            return str(err.get("message") or err)
        return str(err or data)
    except Exception:
        return response.text[:240]


def get_llm(request: Request) -> LLMClient:
    return request.app.state.llm
