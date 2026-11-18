/**
 * Typed API client for the ASAAS Vibe-Coded FastAPI Content Agent backend.
 * Follows skills/frontend/SKILL.md: one shared data access module, zero secrets in bundle.
 */

export const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_MODEL = 'google/gemini-2.5-flash';
export const DEFAULT_MAX_TOKENS = 1200;
export const DEFAULT_STREAMING = true;

export interface ApiProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  keyHint: string;
  description: string;
}

export const POPULAR_PROVIDERS: ApiProviderPreset[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter (شامل)',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.5-flash',
    keyHint: 'sk-or-v1-...',
    description: 'يدعم كافة النماذج مع منع جمع البيانات (Gemini, Nemotron, Llama, Claude, GPT)',
  },
  {
    id: 'gemini',
    name: 'Google Gemini (مباشر)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    keyHint: 'AIzaSy...',
    description: 'استدعاء مباشر لمفتاح Google AI Studio الرسمي عبر بوابة الوكيل',
  },
  {
    id: 'openai',
    name: 'OpenAI (مباشر)',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyHint: 'sk-proj-...',
    description: 'استدعاء مباشر لمفتاح OpenAI الرسمي عبر بوابة الوكيل',
  },
  {
    id: 'groq',
    name: 'Groq (فائق السرعة)',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    keyHint: 'gsk_...',
    description: 'استجابة فائقة السرعة مع نماذج Llama مفتوحة المصدر',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek (مباشر)',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    keyHint: 'sk-...',
    description: 'نماذج DeepSeek V3 و R1 مباشرة',
  },
  {
    id: 'custom',
    name: 'مخصص / محلي (Ollama)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    keyHint: 'اختياري (يمكن تركه فارغاً)',
    description: 'Ollama أو LM Studio أو vLLM أو أي سيرفر OpenAI-compatible محلي',
  },
];

export interface GeneratedPostItem {
  id: string;
  title: string;
  badge: string;
  content: string;
  words_count: number;
  reading_seconds: number;
}

export interface AgentStepTrace {
  step: number;
  name: string;
  status: 'done' | 'skipped' | 'retried' | 'failed';
  detail: string;
  duration_ms: number;
}

export interface GenerateResult {
  run_id: number;
  session_id: string;
  posts: GeneratedPostItem[];
  score: number;
  feedback: string;
  used_model: string;
  prompt_version: string;
  iterations: number;
  stop_reason: string;
  tools_used: string[];
  reasoning_tokens?: number | null;
  latency_ms: number;
  trace: AgentStepTrace[];
}

export interface AgentRunSummary {
  id: number;
  session_id: string;
  brand_name: string;
  platform: string;
  topic: string;
  target_seconds: number;
  variants_count: number;
  used_model: string;
  tone_score: number;
  iterations: number;
  stop_reason: string;
  latency_ms: number;
  created_at: string;
}

export interface AgentRunDetail extends AgentRunSummary {
  dialect: string;
  target_audience: string;
  prompt_version: string;
  evaluator_feedback: string;
  tools_used: string[];
  posts: GeneratedPostItem[];
  trace: AgentStepTrace[];
}

export interface ArchitectureInfo {
  engine: string;
  architecture_style: string;
  skills_source: string;
  skills_applied: string[];
  prompts: Record<string, string>;
  tools: Array<{ name: string; type: string; description: string }>;
  guardrails: Record<string, string | number>;
  pipeline: Array<{
    step: number;
    name: string;
    component: string;
    skill_ref: string;
    description: string;
  }>;
}

export function getStoredBaseUrl(): string {
  try {
    return localStorage.getItem('asaas_api_base_url')?.trim() || DEFAULT_BASE_URL;
  } catch {
    return DEFAULT_BASE_URL;
  }
}

export function setStoredBaseUrl(url: string) {
  try {
    localStorage.setItem('asaas_api_base_url', url.trim());
  } catch {}
}

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem('asaas_openrouter_key')?.trim() || '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(key: string) {
  try {
    localStorage.setItem('asaas_openrouter_key', key.trim());
  } catch {}
}

export function getStoredModel(): string {
  try {
    return localStorage.getItem('asaas_openrouter_model')?.trim() || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export function setStoredModel(model: string) {
  try {
    localStorage.setItem('asaas_openrouter_model', model.trim());
  } catch {}
}

export function getStoredMaxTokens(): number {
  try {
    const val = Number(localStorage.getItem('asaas_max_tokens'));
    if (Number.isFinite(val) && val >= 200 && val <= 8000) return val;
    return DEFAULT_MAX_TOKENS;
  } catch {
    return DEFAULT_MAX_TOKENS;
  }
}

export function setStoredMaxTokens(tokens: number) {
  try {
    localStorage.setItem('asaas_max_tokens', String(tokens));
  } catch {}
}

export function getStoredStreaming(): boolean {
  try {
    const val = localStorage.getItem('asaas_enable_streaming');
    if (val === 'false') return false;
    return DEFAULT_STREAMING;
  } catch {
    return DEFAULT_STREAMING;
  }
}

export function setStoredStreaming(enabled: boolean) {
  try {
    localStorage.setItem('asaas_enable_streaming', enabled ? 'true' : 'false');
  } catch {}
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '';

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string; detail?: string };
    return data.message || data.detail || `فشل الطلب برمز HTTP ${response.status}`;
  } catch {
    return `فشل الاتصال بالخادم (HTTP ${response.status})`;
  }
}

export async function generateContentViaAgent(params: {
  brandName: string;
  platform: string;
  dialect: string;
  targetAudience: string;
  topic: string;
  targetSeconds: number;
  variantsCount: number;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  enableStreaming?: boolean;
  onStepChange?: (step: number, label?: string) => void;
  onStreamContent?: (cumulativeText: string, model?: string) => void;
}): Promise<GenerateResult> {
  const payload = {
    brand_name: params.brandName,
    platform: params.platform,
    dialect: params.dialect,
    target_audience: params.targetAudience,
    topic: params.topic,
    target_seconds: params.targetSeconds,
    variants_count: params.variantsCount,
    enable_reflexion: true,
    base_url: params.baseUrl?.trim() || undefined,
    api_key: params.apiKey?.trim() || undefined,
    model: params.model?.trim() || undefined,
    max_tokens: params.maxTokens,
  };

  if (params.enableStreaming === false) {
    params.onStepChange?.(2);
    const res = await fetch(`${API_BASE}/api/agent/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res));
    }
    const result = (await res.json()) as GenerateResult;
    params.onStepChange?.(5);
    return result;
  }

  // Server-Sent Events (SSE) live stream from FastAPI backend
  const res = await fetch(`${API_BASE}/api/agent/generate/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  if (!res.body) {
    throw new Error('لم يرسل الخادم تدفق بيانات البث المباشر.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalResult: GenerateResult | null = null;
  let currentEvent = 'message';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';

    for (const block of blocks) {
      const lines = block.split('\n');
      let dataLine = '';
      currentEvent = 'message';
      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLine += line.slice(5).trim();
        }
      }
      if (!dataLine) continue;

      const parsed = JSON.parse(dataLine);
      if (currentEvent === 'step') {
        params.onStepChange?.(parsed.step, parsed.label);
      } else if (currentEvent === 'delta') {
        params.onStreamContent?.(parsed.cumulative || '', parsed.model);
      } else if (currentEvent === 'error') {
        throw new Error(parsed.message || 'فشل تشغيل الوكيل.');
      } else if (currentEvent === 'done') {
        finalResult = parsed as GenerateResult;
      }
    }
  }

  if (!finalResult) {
    throw new Error('انتهى البث قبل استلام النتيجة النهائية المعتمدة من الوكيل.');
  }
  return finalResult;
}

export async function testAgentConnection(params: {
  baseUrl?: string;
  apiKey?: string;
  model: string;
}): Promise<{ success: boolean; latency_ms: number; model: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/agent/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_url: params.baseUrl?.trim() || undefined,
      api_key: params.apiKey?.trim() || undefined,
      model: params.model.trim(),
    }),
  });
  if (!res.ok) {
    return {
      success: false,
      latency_ms: 0,
      model: params.model,
      message: await parseErrorMessage(res),
    };
  }
  return res.json();
}

export async function fetchAgentArchitecture(): Promise<ArchitectureInfo> {
  const res = await fetch(`${API_BASE}/api/agent/architecture`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json();
}

export async function fetchAgentRuns(limit = 20): Promise<AgentRunSummary[]> {
  const res = await fetch(`${API_BASE}/api/agent/runs?limit=${limit}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json();
}

export async function fetchAgentRunDetail(runId: number): Promise<AgentRunDetail> {
  const res = await fetch(`${API_BASE}/api/agent/runs/${runId}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json();
}

export async function chatWithAgentAssistant(params: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}): Promise<{ reply: string; used_model: string; prompt_version: string }> {
  const res = await fetch(`${API_BASE}/api/agent/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: params.message,
      history: params.history,
      base_url: params.baseUrl?.trim() || undefined,
      api_key: params.apiKey?.trim() || undefined,
      model: params.model?.trim() || undefined,
    }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json();
}
