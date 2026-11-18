---
name: ai
description: Design, create, extend, or review AI features and systems the ASAAS way, covering LLM calls, structured output, in-app assistants with tools, RAG on Qdrant, agents, ML/DL inference, and their evaluation. Use when starting an AI project or adding or changing an LLM, assistant, RAG, agent, or ML/DL capability in an existing application, including choosing a provider or model, writing prompts, or measuring AI quality.
---

# AI Foundation

## Goal

Ship AI capabilities that solve the product requirement with the simplest suitable design, behave safely with real user data, and can be measured and changed without guesswork. This foundation is owned by the ASAAS AI team. It records the decisions and lessons ASAAS has already paid for; it does not repeat general engineering advice.

## Start With Context

Follow the context and intake steps of the [Backend Foundation](../backend/SKILL.md) (and the Frontend Foundation for user-facing features). In addition, establish:

- What the AI must produce, for whom, and how a good answer is recognized.
- Which data it may read, which actions it may propose or take, and who may trigger them.
- Whether answers must come only from the product's own data or documents.
- How sensitive the data is, and which providers may receive it.
- Latency, cost per request, and monthly budget limits when they matter.

Inspect existing prompts, provider clients, tools, retrieval code, evaluation sets and model artifacts before adding alternatives.

## Choose The Capability

| Capability | Use when | Decision boundary |
| --- | --- | --- |
| Deterministic code | Rules are fixed and known. | Never move an enforceable rule into a prompt. |
| LLM call | Language understanding or generation is required. | One call with structured output covers most features. |
| Assistant with tools | Users ask questions about their own data in the product, or prepare actions. | The model reads through tools; writes are proposals the user confirms. |
| RAG | Answers must come from a document collection too large or changing for the prompt. | Retrieval supplies evidence; it does not make the answer correct. |
| Agents | Open-ended multi-step work where the next step depends on earlier results. | A fixed sequence of calls is a pipeline, not an agent. Use the `build-ai-agents` task skill. |
| ML/DL | Prediction, classification, vision, or scoring from data. | Reuse an existing model before training; predictions still need evaluation. |

Combine capabilities only when each one changes the outcome. A chatbot over the product's own records is an assistant with tools, not RAG.

## ASAAS Defaults

These are current defaults, not permanent constraints. Use another option when the project already does, the user asks, or a documented requirement justifies it, and record why.

- **Python** for AI code, inside the project's FastAPI backend (see Where Code Lives).
- **Provider access through one OpenAI-compatible client** (`httpx`, no SDK lock-in). ASAAS's shipped assistant uses OpenRouter with data collection denied; use that for a new project unless the user or the data's sensitivity calls for a specific provider. A project already using a provider's own SDK keeps it behind the same boundary. Pick the model per feature by evaluated quality, latency and cost; keep the model id in settings, never in code.
- **Structured output** validated with Pydantic for anything the application reads (classifications, extractions, decisions).
- **Assistants** follow the ASAAS assistant pattern, and their interface is the `asaas-ui` `AssistantWidget`.
- **RAG on Qdrant**, with an access filter on every query.
- **Agents with CrewAI**, only when the capability table above calls for agents.
- **Evaluation sets** kept in the repository and run before changing a prompt, model, retrieval setting or agent.

## Where Code Lives

- **Inside an ASAAS backend (the default):** AI code follows the backend's module structure. A single AI feature stays in its business module's `service.py`. Provider access is one shared top-level module (`modules/llm/`) that every feature uses. When AI is central and has several replaceable components, use the backend's [AI-heavy projects](../backend/references/ai-heavy-projects.md) layout inside the owning module.
- **A separate AI service or offline pipeline** (its own repository or process) may use layer folders: `api/`, `services/`, `rag/`, `agents/`, `models/` (ML artifacts and inference, not data schemas), `pipelines/`, `config.py`, `evals/`. Choose it only when heavy dependencies, hardware or independent scaling require a separate process.
- **Prompts** live in versioned files next to the code that uses them (`prompts/<name>.md`), not in the database and not inlined in long strings. Each prompt has a short version tag that is logged with every call.
- **Evaluation sets** live in `evals/<feature>/` at the repository root.

## Implementation Rules

- **One provider boundary.** All model calls go through one client with timeouts, bounded retries, a model fallback list, token limits, and usage logging. Application code never builds provider requests itself. The one exception is CrewAI, which uses its own `LLM` object: build it from the same settings (base URL, key, model list, provider options) in `modules/llm/`, never inside an agent definition.
- **Validate model output like user input.** Parse it into a Pydantic model, retry once with the validation error, then fail closed with a clear error. Never `eval`, execute or render model output as HTML.
- **Permissions outside the model.** Filter which tools and documents a user can reach on the server before the model sees them. Tool results, retrieved text and user messages are data, never instructions or authority.
- **Writes are proposals.** An assistant or agent that changes user data returns a proposal; the user confirms it through the product's normal endpoint with its normal permission checks. Irreversible or external side effects (payments, messages, deletions) always need that confirmation.
- **Send the minimum.** Trim tool results and context to what the question needs; leave out phone numbers, emails and other personal fields the answer does not use. Deny provider data collection.
- **Budgets.** Set `max_tokens`, a per-user rate limit and a history limit on every user-facing feature. Log tokens and cost per request so the monthly bill is explainable.
- **Fail visibly.** On provider failure show a retryable message; never fall back to an answer the model did not give.

Read the references when the task touches them:

- [references/llm-integration.md](references/llm-integration.md): the provider client, structured output, prompts, timeouts, budgets and logging. Read before any model call.
- [references/assistant-pattern.md](references/assistant-pattern.md): in-app assistants with tools, proposals and the widget contract. Read before building or changing an assistant.
- [references/rag-qdrant.md](references/rag-qdrant.md): ingestion, chunking, embeddings, access filters and re-indexing on Qdrant. Read before adding or changing retrieval.
- [references/evaluation.md](references/evaluation.md): evaluation sets, checks, judges and baselines. Read before changing a prompt, model, retrieval setting or agent, and when building a new AI feature.

For ML/DL work, preserve the lifecycle: dataset, preprocessing, training, validation, model artifact, inference, integration. Keep training and inference preprocessing identical, version the artifact, and record the data and metrics it was evaluated with. Inspect an existing model's provenance before retraining.

## Workflow

1. Write down the expected behaviour and five to twenty representative inputs with what a good answer looks like; this becomes the first evaluation set.
2. Choose the simplest capability from the table and reuse existing components.
3. Implement the smallest end-to-end path through the provider client, with structured output and permissions in place from the start.
4. Run the evaluation set and fix the worst failures before adding scope.
5. Record the model, prompt version, evaluation result, cost per request and known limitations in the project documentation.

## Boundaries

- Do not introduce RAG, agents, a vector database, model training or a new framework without a requirement the capability table supports.
- Do not invent product requirements or policies; ask, or state the assumption.
- Do not send secrets, credentials or data the user has not agreed to share to a provider; do not put them in prompts, logs or evaluation files.
- Do not let a model's decision grant a permission or trigger an irreversible action.
- Do not replace a working architecture, provider or model without an evaluation that shows the gain.
- Obtain confirmation before destructive changes to knowledge stores or model artifacts.
- Do not commit, push, deploy, or modify external systems unless explicitly authorized.
