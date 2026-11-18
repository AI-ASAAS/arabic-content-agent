"""Vibe-coded Agentic Content Service following ASAAS AI & Backend Foundations."""

import json
import logging
import time
import uuid
from pathlib import Path
from typing import Any, AsyncIterator

from config import settings
from modules.content_agent.repository import ContentAgentRepository
from modules.content_agent.schemas import (
    AgentRunDetail,
    AgentRunSummary,
    AgentStepTrace,
    ArchitectureNode,
    ArchitectureResponse,
    AssistantRequest,
    AssistantResponse,
    EvaluationResult,
    GenerateRequest,
    GenerateResponse,
    ScriptItem,
    TestConnectionRequest,
    TestConnectionResponse,
)
from modules.content_agent.tools import (
    detect_brand_violations,
    estimate_reading_seconds,
    get_asaas_brand_guidelines,
    get_dialect_guidance,
    get_platform_rules,
    sanitize_script_text,
)
from modules.llm.client import LLMClient, LLMError

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"
SEPARATOR = "[MODEL_SEPARATOR]"

SCRIPT_TITLES = [
    ("السكريبت الأول — زاوية تحليلية حاسمة", "تحليل وقيمة"),
    ("السكريبت الثاني — تشخيص المشكلة والحل", "قصصي عملي"),
    ("السكريبت الثالث — هوك تفاعلي مباشر", "تفاعل سريع"),
    ("السكريبت الرابع — مقارنة استراتيجية", "مقارنة ذكية"),
    ("السكريبت الخامس — خارطة طريق مختصرة", "توجيه عملي"),
]


def load_prompt(name: str) -> tuple[str, str]:
    """Returns (text, version). Line 1 of prompts/<name>.md is `version: <tag>`."""
    raw = (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8")
    first, _, rest = raw.partition("\n")
    version = first.removeprefix("version:").strip() if first.startswith("version:") else f"{name}@1"
    return rest.strip(), version


class ContentAgentService:
    """Orchestrates the vibe-coded Arabic Content Agent (replacing n8n completely)."""

    def __init__(self, llm: LLMClient) -> None:
        self._llm = llm

    def _build_orchestrator_messages(
        self,
        req: GenerateRequest,
        *,
        brand_rules: dict[str, Any],
        platform_rules: dict[str, Any],
        dialect_rules: dict[str, str],
        memory_examples: list[str],
        critique_feedback: str = "",
        violations: list[str] | None = None,
    ) -> tuple[list[dict[str, str]], str]:
        system_prompt, prompt_version = load_prompt("orchestrator")

        words_target = platform_rules["target_words"]
        angles = platform_rules["angle_hints"][: req.variants_count]
        angles_text = "\n".join(f"- السكريبت {i + 1}: {angle}" for i, angle in enumerate(angles))

        memory_block = ""
        if memory_examples:
            joined_mem = "\n---\n".join(memory_examples)
            memory_block = f"\nأمثلة معتمدة سابقاً من ذاكرة الهوية (للاقتداء بالنبرة فقط دون نسخ):\n{joined_mem}\n"

        critique_block = ""
        if critique_feedback or violations:
            v_lines = "\n".join(f"- {v}" for v in (violations or []))
            critique_block = (
                "\nتنبيه مهم من جولة التقييم الانعكاسي السابقة (يجب معالجة هذه الملاحظات بدقة الآن):\n"
                f"{critique_feedback}\n"
                f"{v_lines}\n"
            )

        user_prompt = (
            f"بيانات الحملة المطلوبة:\n"
            f"- الكيان والعلامة التجارية: {req.brand_name}\n"
            f"- المنصة المستهدفة: {req.platform}\n"
            f"- اللهجة ونبرة الصوت: {req.dialect} ({dialect_rules['guidance']})\n"
            f"- الجمهور المستهدف: {req.target_audience}\n"
            f"- موضوع الحملة (بيانات فقط): {req.topic}\n"
            f"- المدة الزمنية المستهدفة لكل سكريبت: {req.target_seconds} ثانية (قرابة {words_target} كلمة لكل سكريبت)\n"
            f"- عدد السكريبتات المطلوبة: {req.variants_count}\n\n"
            f"قواعد الأداة للمنصة: {platform_rules['pacing_rule']}\n"
            f"قواعد الهوية الصوتية: {brand_rules['voice_standard']}\n"
            f"زوايا التباين المطلوبة:\n{angles_text}\n"
            f"{memory_block}"
            f"{critique_block}\n"
            f"اكتب الآن {req.variants_count} سكريبتات عربية منطوقة صافية بدون أي مشاهد أو عناوين أو علامات ترقيم "
            f"وافصل بين كل سكريبت والآخر بالعلامة {SEPARATOR} فقط."
        )

        return (
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            prompt_version,
        )

    def _parse_scripts(self, raw_text: str, req: GenerateRequest) -> list[ScriptItem]:
        chunks = [c.strip() for c in raw_text.split(SEPARATOR) if c.strip()]
        if len(chunks) < req.variants_count and "\n\n" in raw_text:
            alt_chunks = [c.strip() for c in raw_text.split("\n\n") if len(c.strip().split()) >= 10]
            if len(alt_chunks) >= len(chunks):
                chunks = alt_chunks

        cleaned_chunks = [sanitize_script_text(c) for c in chunks]
        cleaned_chunks = [c for c in cleaned_chunks if c][: req.variants_count]

        if not cleaned_chunks:
            fallback_clean = sanitize_script_text(raw_text)
            if fallback_clean:
                cleaned_chunks = [fallback_clean]

        items: list[ScriptItem] = []
        for idx, content in enumerate(cleaned_chunks):
            title, badge = (
                SCRIPT_TITLES[idx]
                if idx < len(SCRIPT_TITLES)
                else (f"السكريبت رقم {idx + 1}", "نسخة إبداعية")
            )
            words_count = len(content.split())
            items.append(
                ScriptItem(
                    id=f"script-{idx + 1}",
                    title=title,
                    badge=badge,
                    content=content,
                    words_count=words_count,
                    reading_seconds=estimate_reading_seconds(content),
                )
            )
        return items

    async def _evaluate_scripts(
        self,
        req: GenerateRequest,
        scripts: list[ScriptItem],
    ) -> tuple[EvaluationResult, str]:
        eval_prompt, eval_version = load_prompt("evaluator")
        deterministic_violations = detect_brand_violations(
            [s.content for s in scripts], req.target_seconds
        )

        combined_text = f"\n{SEPARATOR}\n".join(s.content for s in scripts)
        eval_messages = [
            {"role": "system", "content": eval_prompt},
            {
                "role": "user",
                "content": (
                    f"المنصة: {req.platform}\n"
                    f"الجمهور: {req.target_audience}\n"
                    f"المدة المستهدفة: {req.target_seconds} ثانية\n"
                    f"عدد السكريبتات المطلوبة: {req.variants_count} (المُستلم: {len(scripts)})\n"
                    f"مخالفات الفحص البرمجي الحتمي: {deterministic_violations or 'لا توجد'}\n\n"
                    f"النصوص المولدة للمراجعة:\n{combined_text}"
                ),
            },
        ]

        try:
            evaluation, _ = await self._llm.structured(
                eval_messages,
                EvaluationResult,
                prompt_version=eval_version,
                max_tokens=450,
                temperature=0.0,
                base_url=req.base_url,
                api_key=req.api_key,
                model=req.model,
            )
        except LLMError as err:
            # Deterministic fallback if provider does not support strict evaluation retry
            logger.warning("Evaluator fallback activated due to LLMError: %s", err)
            base_score = 9 if not deterministic_violations else max(5, 8 - len(deterministic_violations))
            evaluation = EvaluationResult(
                tone_score=base_score,
                verbal_feedback=(
                    "تم التحقق البرمجي الحتمي من نقاء السكريبتات وخلوها من المشاهد والرموز ومطابقتها لهوية أساس."
                    if not deterministic_violations
                    else "؛ ".join(deterministic_violations)
                ),
                is_passed=base_score >= settings.agent_quality_threshold,
                violations=deterministic_violations,
            )

        # Merge deterministic violations so code rules always enforce policy (ASAAS AI Skill)
        merged_violations = list(dict.fromkeys([*deterministic_violations, *evaluation.violations]))
        adjusted_score = evaluation.tone_score
        if deterministic_violations and adjusted_score >= settings.agent_quality_threshold:
            adjusted_score = max(6, settings.agent_quality_threshold - 1)

        final_eval = EvaluationResult(
            tone_score=adjusted_score,
            verbal_feedback=evaluation.verbal_feedback,
            is_passed=adjusted_score >= settings.agent_quality_threshold and len(scripts) > 0,
            violations=merged_violations[:8],
        )
        return final_eval, eval_version

    async def generate(self, req: GenerateRequest) -> GenerateResponse:
        """Executes the full vibe-coded agent pipeline and returns a validated GenerateResponse."""
        started = time.perf_counter()
        session_id = f"asaas_{uuid.uuid4().hex[:12]}"
        trace: list[AgentStepTrace] = []
        tools_used: list[str] = []

        # Step 1: Initialize State & Guardrails
        t0 = time.perf_counter()
        max_iterations = settings.agent_max_iterations if req.enable_reflexion else 1
        trace.append(
            AgentStepTrace(
                step=1,
                name="تهيئة حالة الوكيل وسياج الأمان",
                status="done",
                detail=f"session={session_id} | max_iterations={max_iterations} | threshold={settings.agent_quality_threshold}/10",
                duration_ms=int((time.perf_counter() - t0) * 1000),
            )
        )

        # Step 2: Execute Narrow Read-Only Tools
        t1 = time.perf_counter()
        brand_rules = get_asaas_brand_guidelines()
        platform_rules = get_platform_rules(req.platform, req.target_seconds)
        dialect_rules = get_dialect_guidance(req.dialect)
        memory_examples = await ContentAgentRepository.get_approved_examples(req.platform, limit=2)
        tools_used = [
            "asaas_brand_guidelines",
            "platform_adaptation_rules",
            "dialect_tone_rules",
            "approved_runs_memory",
        ]
        trace.append(
            AgentStepTrace(
                step=2,
                name="تشغيل أدوات الهوية والمنصة والذاكرة",
                status="done",
                detail=f"أدوات مفعلة: {', '.join(tools_used)} | أمثلة مسترجعة: {len(memory_examples)}",
                duration_ms=int((time.perf_counter() - t1) * 1000),
            )
        )

        # Step 3 & 4: Bounded Orchestrator + Reflexion Evaluator Loop
        critique_feedback = ""
        violations: list[str] = []
        scripts: list[ScriptItem] = []
        evaluation = EvaluationResult(
            tone_score=8,
            verbal_feedback="متوافق مع هوية أساس",
            is_passed=True,
        )
        used_model = req.model or (settings.llm_models[0] if settings.llm_models else "default")
        prompt_version = "content-orchestrator@1"
        reasoning_tokens: int | None = None
        iterations = 0
        stop_reason = "quality_threshold_passed"

        effective_max_tokens = req.max_tokens or max(
            settings.agent_max_tokens, req.variants_count * max(260, round(req.target_seconds * 4.5))
        )

        for iteration in range(1, max_iterations + 1):
            iterations = iteration
            t_gen = time.perf_counter()
            messages, prompt_version = self._build_orchestrator_messages(
                req,
                brand_rules=brand_rules,
                platform_rules=platform_rules,
                dialect_rules=dialect_rules,
                memory_examples=memory_examples,
                critique_feedback=critique_feedback,
                violations=violations,
            )

            llm_res = await self._llm.chat(
                messages,
                prompt_version=prompt_version,
                max_tokens=effective_max_tokens,
                temperature=0.55 if iteration == 1 else 0.4,
                base_url=req.base_url,
                api_key=req.api_key,
                model=req.model,
            )
            used_model = llm_res.model
            if llm_res.reasoning_tokens is not None:
                reasoning_tokens = llm_res.reasoning_tokens

            scripts = self._parse_scripts(llm_res.content, req)
            if not scripts:
                raise LLMError("أرجع النموذج نصاً فارغاً بعد التصفية. يرجى المحاولة مرة أخرى أو اختيار نموذج آخر.")

            trace.append(
                AgentStepTrace(
                    step=3,
                    name=f"الوكيل المنسق — الجولة {iteration}",
                    status="done" if iteration == 1 else "retried",
                    detail=f"توليد {len(scripts)} سكريبتات نقية عبر {used_model} ({prompt_version})",
                    duration_ms=int((time.perf_counter() - t_gen) * 1000),
                )
            )

            t_eval = time.perf_counter()
            evaluation, eval_version = await self._evaluate_scripts(req, scripts)
            trace.append(
                AgentStepTrace(
                    step=4,
                    name=f"الناقد الانعكاسي ({eval_version}) — الجولة {iteration}",
                    status="done",
                    detail=f"الدرجة: {evaluation.tone_score}/10 | الاعتماد: {'ناجح' if evaluation.is_passed else 'يحتاج تحسين'}",
                    duration_ms=int((time.perf_counter() - t_eval) * 1000),
                )
            )

            if evaluation.is_passed:
                stop_reason = f"quality_threshold_passed ({evaluation.tone_score}/10)"
                break
            if iteration >= max_iterations:
                stop_reason = f"max_iteration_cap_reached ({max_iterations} loops)"
                break

            critique_feedback = evaluation.verbal_feedback
            violations = evaluation.violations

        # Step 5: Persist to SQLite
        total_ms = int((time.perf_counter() - started) * 1000)
        trace.append(
            AgentStepTrace(
                step=5,
                name="اعتماد المخرجات وحفظ السجل في SQLite",
                status="done",
                detail=f"سبب التوقف: {stop_reason} | الزمن الكلي: {total_ms}ms",
                duration_ms=5,
            )
        )

        run_id = await ContentAgentRepository.save_run(
            session_id=session_id,
            brand_name=req.brand_name,
            platform=req.platform,
            dialect=req.dialect,
            target_audience=req.target_audience,
            topic=req.topic,
            target_seconds=req.target_seconds,
            variants_count=req.variants_count,
            used_model=used_model,
            prompt_version=prompt_version,
            iterations=iterations,
            tone_score=evaluation.tone_score,
            stop_reason=stop_reason,
            evaluator_feedback=evaluation.verbal_feedback,
            tools_used=tools_used,
            posts=[p.model_dump() for p in scripts],
            trace=[t.model_dump() for t in trace],
            latency_ms=total_ms,
        )

        return GenerateResponse(
            run_id=run_id,
            session_id=session_id,
            posts=scripts,
            score=evaluation.tone_score,
            feedback=evaluation.verbal_feedback,
            used_model=used_model,
            prompt_version=prompt_version,
            iterations=iterations,
            stop_reason=stop_reason,
            tools_used=tools_used,
            reasoning_tokens=reasoning_tokens,
            latency_ms=total_ms,
            trace=trace,
        )

    async def generate_stream(self, req: GenerateRequest) -> AsyncIterator[str]:
        """Streams Server-Sent Events (SSE) for real-time progress and live token output."""

        def sse(event: str, payload: dict[str, Any]) -> str:
            return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"

        started = time.perf_counter()
        session_id = f"asaas_{uuid.uuid4().hex[:12]}"
        trace: list[AgentStepTrace] = []

        try:
            # Step 1: Init
            yield sse("step", {"step": 1, "label": "تهيئة حالة الوكيل وسياج الأمان"})
            max_iterations = settings.agent_max_iterations if req.enable_reflexion else 1
            trace.append(
                AgentStepTrace(
                    step=1,
                    name="تهيئة حالة الوكيل وسياج الأمان",
                    status="done",
                    detail=f"session={session_id} | max_iterations={max_iterations}",
                )
            )

            # Step 2: Tools
            yield sse("step", {"step": 2, "label": "تشغيل أدوات هوية أساس والذاكرة"})
            t1 = time.perf_counter()
            brand_rules = get_asaas_brand_guidelines()
            platform_rules = get_platform_rules(req.platform, req.target_seconds)
            dialect_rules = get_dialect_guidance(req.dialect)
            memory_examples = await ContentAgentRepository.get_approved_examples(req.platform, limit=2)
            tools_used = [
                "asaas_brand_guidelines",
                "platform_adaptation_rules",
                "dialect_tone_rules",
                "approved_runs_memory",
            ]
            trace.append(
                AgentStepTrace(
                    step=2,
                    name="تشغيل أدوات الهوية والمنصة والذاكرة",
                    status="done",
                    detail=f"أدوات: {', '.join(tools_used)} | أمثلة مسترجعة: {len(memory_examples)}",
                    duration_ms=int((time.perf_counter() - t1) * 1000),
                )
            )

            # Step 3: Stream Orchestrator
            yield sse("step", {"step": 3, "label": "الوكيل المنسق يكتب السكريبتات مباشرة"})
            t_gen = time.perf_counter()
            messages, prompt_version = self._build_orchestrator_messages(
                req,
                brand_rules=brand_rules,
                platform_rules=platform_rules,
                dialect_rules=dialect_rules,
                memory_examples=memory_examples,
            )
            effective_max_tokens = req.max_tokens or max(
                settings.agent_max_tokens, req.variants_count * max(260, round(req.target_seconds * 4.5))
            )

            full_output = ""
            used_model = req.model or (settings.llm_models[0] if settings.llm_models else "default")

            async for delta, model_name in self._llm.stream_chat(
                messages,
                prompt_version=prompt_version,
                max_tokens=effective_max_tokens,
                temperature=0.55,
                base_url=req.base_url,
                api_key=req.api_key,
                model=req.model,
            ):
                used_model = model_name
                full_output += delta
                yield sse("delta", {"delta": delta, "cumulative": full_output, "model": used_model})

            scripts = self._parse_scripts(full_output, req)
            if not scripts:
                raise LLMError("أرجع النموذج نصاً فارغاً بعد التصفية. يرجى المحاولة مرة أخرى.")

            trace.append(
                AgentStepTrace(
                    step=3,
                    name="الوكيل المنسق — الجولة 1 (بث مباشر)",
                    status="done",
                    detail=f"توليد {len(scripts)} سكريبتات نقية عبر {used_model} ({prompt_version})",
                    duration_ms=int((time.perf_counter() - t_gen) * 1000),
                )
            )

            # Step 4: Reflexion Evaluator + optional single refinement pass
            yield sse("step", {"step": 4, "label": "الناقد الانعكاسي يفحص الجودة والالتزام"})
            t_eval = time.perf_counter()
            evaluation, eval_version = await self._evaluate_scripts(req, scripts)
            iterations = 1
            stop_reason = f"quality_threshold_passed ({evaluation.tone_score}/10)"

            trace.append(
                AgentStepTrace(
                    step=4,
                    name=f"الناقد الانعكاسي ({eval_version}) — الجولة 1",
                    status="done",
                    detail=f"الدرجة: {evaluation.tone_score}/10",
                    duration_ms=int((time.perf_counter() - t_eval) * 1000),
                )
            )

            if not evaluation.is_passed and max_iterations >= 2:
                iterations = 2
                yield sse(
                    "step",
                    {"step": 3, "label": "إعادة الصياغة التلقائية بناءً على ملاحظات الناقد الانعكاسي"},
                )
                retry_messages, prompt_version = self._build_orchestrator_messages(
                    req,
                    brand_rules=brand_rules,
                    platform_rules=platform_rules,
                    dialect_rules=dialect_rules,
                    memory_examples=memory_examples,
                    critique_feedback=evaluation.verbal_feedback,
                    violations=evaluation.violations,
                )
                retry_output = ""
                async for delta, model_name in self._llm.stream_chat(
                    retry_messages,
                    prompt_version=prompt_version,
                    max_tokens=effective_max_tokens,
                    temperature=0.4,
                    base_url=req.base_url,
                    api_key=req.api_key,
                    model=req.model,
                ):
                    used_model = model_name
                    retry_output += delta
                    yield sse("delta", {"delta": delta, "cumulative": retry_output, "model": used_model})

                retry_scripts = self._parse_scripts(retry_output, req)
                if retry_scripts:
                    scripts = retry_scripts
                    yield sse("step", {"step": 4, "label": "إعادة التقييم النهائي للجودة"})
                    evaluation, eval_version = await self._evaluate_scripts(req, scripts)
                    stop_reason = (
                        f"quality_threshold_passed ({evaluation.tone_score}/10)"
                        if evaluation.is_passed
                        else f"max_iteration_cap_reached ({max_iterations} loops)"
                    )
                    trace.append(
                        AgentStepTrace(
                            step=4,
                            name=f"الناقد الانعكاسي ({eval_version}) — الجولة 2",
                            status="retried",
                            detail=f"الدرجة بعد التحسين: {evaluation.tone_score}/10",
                        )
                    )

            # Step 5: Persist and finish
            yield sse("step", {"step": 5, "label": "اعتماد المخرجات وحفظ السجل في SQLite"})
            total_ms = int((time.perf_counter() - started) * 1000)
            trace.append(
                AgentStepTrace(
                    step=5,
                    name="اعتماد المخرجات وحفظ السجل في SQLite",
                    status="done",
                    detail=f"سبب التوقف: {stop_reason} | الزمن: {total_ms}ms",
                )
            )

            run_id = await ContentAgentRepository.save_run(
                session_id=session_id,
                brand_name=req.brand_name,
                platform=req.platform,
                dialect=req.dialect,
                target_audience=req.target_audience,
                topic=req.topic,
                target_seconds=req.target_seconds,
                variants_count=req.variants_count,
                used_model=used_model,
                prompt_version=prompt_version,
                iterations=iterations,
                tone_score=evaluation.tone_score,
                stop_reason=stop_reason,
                evaluator_feedback=evaluation.verbal_feedback,
                tools_used=tools_used,
                posts=[p.model_dump() for p in scripts],
                trace=[t.model_dump() for t in trace],
                latency_ms=total_ms,
            )

            final_response = GenerateResponse(
                run_id=run_id,
                session_id=session_id,
                posts=scripts,
                score=evaluation.tone_score,
                feedback=evaluation.verbal_feedback,
                used_model=used_model,
                prompt_version=prompt_version,
                iterations=iterations,
                stop_reason=stop_reason,
                tools_used=tools_used,
                reasoning_tokens=None,
                latency_ms=total_ms,
                trace=trace,
            )
            yield sse("done", final_response.model_dump())
        except LLMError as error:
            yield sse("error", {"message": str(error)})
        except Exception as error:
            logger.exception("Unhandled error during agent stream")
            yield sse("error", {"message": f"حدث خطأ غير متوقع أثناء تشغيل الوكيل: {type(error).__name__}"})

    async def test_connection(self, req: TestConnectionRequest) -> TestConnectionResponse:
        started = time.perf_counter()
        try:
            res = await self._llm.chat(
                [{"role": "user", "content": "قل مرحباً في كلمتين فقط"}],
                prompt_version="connection-probe@1",
                max_tokens=30,
                temperature=0.0,
                base_url=req.base_url,
                api_key=req.api_key,
                model=req.model,
            )
            elapsed = int((time.perf_counter() - started) * 1000)
            return TestConnectionResponse(
                success=True,
                latency_ms=elapsed,
                model=res.model,
                message=f"تم الاتصال بنجاح بمحرك {res.model} خلال {elapsed}ms",
            )
        except LLMError as error:
            elapsed = int((time.perf_counter() - started) * 1000)
            return TestConnectionResponse(
                success=False,
                latency_ms=elapsed,
                model=req.model,
                message=str(error),
            )

    async def chat_assistant(self, req: AssistantRequest) -> AssistantResponse:
        system_prompt, prompt_version = load_prompt("assistant")
        # Enforce ASAAS AI Skill history limit: last 8 messages
        trimmed_history = req.history[-8:]
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend({"role": m.role, "content": m.content} for m in trimmed_history)
        messages.append({"role": "user", "content": req.message})

        result = await self._llm.chat(
            messages,
            prompt_version=prompt_version,
            max_tokens=700,
            temperature=0.5,
            base_url=req.base_url,
            api_key=req.api_key,
            model=req.model,
        )
        return AssistantResponse(
            reply=result.content.strip(),
            used_model=result.model,
            prompt_version=prompt_version,
        )

    async def list_runs(self, limit: int = 20) -> list[AgentRunSummary]:
        rows = await ContentAgentRepository.list_recent_runs(limit=limit)
        return [AgentRunSummary(**row) for row in rows]

    async def get_run(self, run_id: int) -> AgentRunDetail | None:
        row = await ContentAgentRepository.get_run_by_id(run_id)
        if row is None:
            return None
        return AgentRunDetail(
            id=row["id"],
            session_id=row["session_id"],
            brand_name=row["brand_name"],
            platform=row["platform"],
            dialect=row["dialect"],
            target_audience=row["target_audience"],
            topic=row["topic"],
            target_seconds=row["target_seconds"],
            variants_count=row["variants_count"],
            used_model=row["used_model"],
            prompt_version=row["prompt_version"],
            iterations=row["iterations"],
            tone_score=row["tone_score"],
            stop_reason=row["stop_reason"],
            evaluator_feedback=row["evaluator_feedback"],
            tools_used=json.loads(row["tools_used_json"] or "[]"),
            posts=[ScriptItem(**p) for p in json.loads(row["posts_json"] or "[]")],
            trace=[AgentStepTrace(**t) for t in json.loads(row["trace_json"] or "[]")],
            latency_ms=row["latency_ms"],
            created_at=row["created_at"],
        )

    def get_architecture(self) -> ArchitectureResponse:
        _, orch_ver = load_prompt("orchestrator")
        _, eval_ver = load_prompt("evaluator")
        _, asst_ver = load_prompt("assistant")
        return ArchitectureResponse(
            engine="ASAAS Vibe-Coded Python Agent (FastAPI + Pydantic + SQLite)",
            architecture_style="Modular Clean Vibe-Coded Agent (Zero n8n Dependency)",
            skills_source="https://github.com/AI-ASAAS/skills",
            skills_applied=[
                "ai/SKILL.md — One OpenAI-compatible httpx boundary, data collection denied, versioned prompts, budgets",
                "ai/build-ai-agents/SKILL.md — Bounded Reflexion loop, narrow read-only tools, explicit stop reasons",
                "backend/SKILL.md — Modular FastAPI (router/schemas/service/repository), SQLite WAL + migrations, unified {message} errors",
                "frontend/SKILL.md + asaas-ui — Arabic RTL, Thmanyah typography, glass tokens, zero secrets in browser bundle",
                "ai/references/evaluation.md — Versioned evals/content_agent/cases.jsonl & deterministic checks",
            ],
            prompts={
                "orchestrator": orch_ver,
                "evaluator": eval_ver,
                "assistant": asst_ver,
            },
            tools=[
                {
                    "name": "asaas_brand_guidelines",
                    "type": "read-only deterministic tool",
                    "description": "استرجاع رموز هوية أساس وخط ثمانية وقائمة العبارات المحظورة ومعايير النبرة.",
                },
                {
                    "name": "platform_adaptation_rules",
                    "type": "read-only deterministic tool",
                    "description": "حساب ميزانية الكلمات حسب المدة بالثواني وتكييف زوايا الإلقاء لكل منصة.",
                },
                {
                    "name": "dialect_tone_rules",
                    "type": "read-only deterministic tool",
                    "description": "تحديد ضوابط اللهجة والإلقاء الصوتي المختار بدقة.",
                },
                {
                    "name": "approved_runs_memory",
                    "type": "SQLite read-only memory tool",
                    "description": "استرجاع أحدث النماذج المعتمدة بدرجة >= 8 من قاعدة بيانات SQLite المحلية للاقتداء بها.",
                },
            ],
            guardrails={
                "max_reflexion_iterations": settings.agent_max_iterations,
                "quality_threshold": settings.agent_quality_threshold,
                "rate_limit_per_hour": settings.agent_rate_limit_per_hour,
                "timeout_seconds": int(settings.llm_timeout_seconds),
                "data_collection_policy": "deny",
            },
            pipeline=[
                ArchitectureNode(
                    step=1,
                    name="Request Validation & Guardrail Init",
                    component="modules/content_agent/router.py + schemas.py",
                    skill_ref="backend/SKILL.md",
                    description="التحقق الصارم من المدخلات عبر Pydantic وتطبيق حد المعدل (Rate Limit) وتهيئة حالة الوكيل.",
                ),
                ArchitectureNode(
                    step=2,
                    name="Narrow Read-Only Agent Tools",
                    component="modules/content_agent/tools.py + repository.py",
                    skill_ref="ai/build-ai-agents/SKILL.md",
                    description="استدعاء أدوات هوية أساس وقواعد المنصة واللهجة وذاكرة النماذج المعتمدة في SQLite.",
                ),
                ArchitectureNode(
                    step=3,
                    name="Orchestrator Agent & Live SSE Stream",
                    component="modules/content_agent/service.py + modules/llm/client.py",
                    skill_ref="ai/references/llm-integration.md",
                    description="توليد السكريبتات النقية عبر بوابة httpx الموحدة مع بث مباشر فوري وإعادة محاولة ذكية.",
                ),
                ArchitectureNode(
                    step=4,
                    name="Deterministic Sanitizer & Reflexion Evaluator",
                    component="tools.py + llm.structured(EvaluationResult)",
                    skill_ref="ai/SKILL.md",
                    description="تنظيف برمجي حتمي من المشاهد والرموز متبوعاً بتقييم هيكلي من 10 درجات وحلقة تحسين مقيدة (بحد أقصى جولتين).",
                ),
                ArchitectureNode(
                    step=5,
                    name="SQLite Persistence & Audit Trace",
                    component="database.py + migrations/runner.py",
                    skill_ref="backend/references/database-and-migrations.md",
                    description="حفظ النتيجة الكاملة وسجل الخطوات والأدوات والدرجات في قاعدة البيانات المحلية data/app.db.",
                ),
            ],
        )
