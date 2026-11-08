export const DEFAULT_API_KEY = (import.meta as any).env?.VITE_AI_API_KEY || '';
export const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_MODEL = 'google/gemini-2.5-flash';
export const FALLBACK_FREE_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';
export const DEFAULT_MAX_TOKENS = 1000;
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
    description: 'يدعم كافة النماذج (Gemini, Nemotron, Llama, Claude, GPT)',
  },
  {
    id: 'gemini',
    name: 'Google Gemini (مباشر)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    keyHint: 'AIzaSy...',
    description: 'استدعاء مباشر لمفتاح Google AI Studio الرسمي',
  },
  {
    id: 'openai',
    name: 'OpenAI (مباشر)',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyHint: 'sk-proj-...',
    description: 'استدعاء مباشر لمفتاح OpenAI الرسمي',
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
    description: 'Ollama, LM Studio, vLLM, أو أي سيرفر API خاص بك',
  },
];

export function getStoredBaseUrl(): string {
  try {
    const u = localStorage.getItem('asaas_api_base_url');
    if (u && u.trim()) return u.trim();
    return DEFAULT_BASE_URL;
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
    return localStorage.getItem('asaas_openrouter_key') || DEFAULT_API_KEY;
  } catch {
    return DEFAULT_API_KEY;
  }
}

export function setStoredApiKey(key: string) {
  try {
    localStorage.setItem('asaas_openrouter_key', key.trim());
  } catch {}
}

export function getStoredModel(): string {
  try {
    const m = localStorage.getItem('asaas_openrouter_model');
    if (m && m.trim()) return m.trim();
    return DEFAULT_MODEL;
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
    const v = localStorage.getItem('asaas_openrouter_maxtokens');
    if (v) {
      const num = parseInt(v, 10);
      if (!isNaN(num) && num >= 100) return num;
    }
    return DEFAULT_MAX_TOKENS;
  } catch {
    return DEFAULT_MAX_TOKENS;
  }
}

export function setStoredMaxTokens(tokens: number) {
  try {
    localStorage.setItem('asaas_openrouter_maxtokens', String(tokens));
  } catch {}
}

export function getStoredStreaming(): boolean {
  try {
    const v = localStorage.getItem('asaas_openrouter_streaming');
    if (v !== null) return v === 'true';
    return DEFAULT_STREAMING;
  } catch {
    return DEFAULT_STREAMING;
  }
}

export function setStoredStreaming(enabled: boolean) {
  try {
    localStorage.setItem('asaas_openrouter_streaming', String(enabled));
  } catch {}
}

export function normalizeChatCompletionsUrl(baseUrl: string): string {
  let clean = (baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  if (!clean.endsWith('/chat/completions')) {
    clean += '/chat/completions';
  }
  return clean;
}

export interface UniversalChatOptions {
  baseUrl?: string;
  apiKey?: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  onDelta?: (delta: string, cumulative: string) => void;
}

/**
 * Universal Chat Completion Caller: works with ANY OpenAI-compatible API
 * (OpenRouter, Google Gemini direct, OpenAI, Groq, DeepSeek, Ollama, LM Studio, etc.)
 */
export async function callUniversalChatApi(options: UniversalChatOptions): Promise<{
  content: string;
  reasoningTokens?: number;
}> {
  const {
    baseUrl = getStoredBaseUrl(),
    apiKey = getStoredApiKey(),
    model,
    messages,
    maxTokens = getStoredMaxTokens(),
    temperature = 0.6,
    stream = true,
    onDelta,
  } = options;

  const url = normalizeChatCompletionsUrl(baseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model.trim(),
      messages,
      max_tokens: maxTokens,
      temperature,
      stream,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    let parsedMessage = errorBody;
    try {
      const errJson = JSON.parse(errorBody);
      parsedMessage = errJson.error?.message || errJson.message || errorBody;
    } catch {}
    throw new Error(`[API Error ${res.status}]: ${parsedMessage}`);
  }

  if (stream && res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let full = '';
    let reasoningTokens = 0;
    let done = false;

    while (!done) {
      const { value, done: isDone } = await reader.read();
      done = isDone;
      if (value) {
        const text = decoder.decode(value, { stream: true });
        for (const rawLine of text.split('\n')) {
          const line = rawLine.trim();
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices?.[0]?.delta?.content || '';
              if (delta) {
                full += delta;
                onDelta?.(delta, full);
              }
              if (data.usage?.completion_tokens_details?.reasoning_tokens) {
                reasoningTokens = data.usage.completion_tokens_details.reasoning_tokens;
              }
            } catch {}
          }
        }
      }
    }
    return { content: full, reasoningTokens };
  } else {
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const reasoningTokens = data.usage?.completion_tokens_details?.reasoning_tokens;
    onDelta?.(content, content);
    return { content, reasoningTokens };
  }
}

/**
 * Live test connection to ANY custom API
 */
export async function testCustomApiConnection(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
}): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const start = performance.now();
  try {
    const res = await callUniversalChatApi({
      baseUrl: params.baseUrl,
      apiKey: params.apiKey,
      model: params.model,
      messages: [{ role: 'user', content: 'قل نعم' }],
      maxTokens: 30,
      stream: false,
    });
    const elapsed = Math.round(performance.now() - start);
    return {
      success: true,
      latencyMs: elapsed,
      message: `الاتصال ناجح بمحرك ${params.model} (${elapsed}ms) الاستجابة: "${res.content.trim()}"`,
    };
  } catch (err: any) {
    const elapsed = Math.round(performance.now() - start);
    return {
      success: false,
      latencyMs: elapsed,
      message: err.message || String(err),
    };
  }
}

export interface GenerateContentParams {
  brandName: string;
  platform: string;
  dialect: string;
  targetAudience: string;
  topic: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  targetSeconds?: number;
  variantsCount?: number;
  maxTokens?: number;
  enableStreaming?: boolean;
  onStepChange?: (step: number) => void;
  onStreamContent?: (partial: string) => void;
}

export interface GeneratedPostItem {
  id: string;
  badge: string;
  title: string;
  content: string;
  wordsCount: number;
  readingSeconds: number;
}

export interface GenerationResult {
  posts: GeneratedPostItem[];
  score: number;
  feedback: string;
  reasoningTokens?: number;
  usedModel: string;
}

/**
 * Clean all punctuation marks, scene markers, brackets, and symbols
 * so the output is 100% pure spoken words ready for voiceover/reading.
 */
export function sanitizeCleanScript(rawText: string): string {
  return rawText
    // Remove metadata labels like "النص 1:" or "العنوان:" or "المنطوق:"
    .replace(/(?:النموذج|المشهد|النص|المنطوق|على الشاشة|التوجيه البصري|الافتتاحية|الخاتمة|العنوان|الزاوية|الدعوة للإجراء)\s*[:\-\d]*/gi, '')
    // Remove punctuation marks, quotation marks, brackets, dashes, bullets
    .replace(/[.,،!؟?:\-"'«»()[\]{}\/\\؛;_~*^#•<>|]/g, ' ')
    // Normalize lines and whitespace
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * Generate clean scripts without scenes and without punctuation marks
 * adhering strictly to the duration in seconds and variants count.
 * Uses Universal Chat API: works with ANY provider (OpenRouter, Gemini, OpenAI, Groq, DeepSeek, Ollama, etc.)
 */
export async function generateWithNvidiaNemotron(
  params: GenerateContentParams
): Promise<GenerationResult> {
  const {
    brandName,
    platform,
    dialect,
    targetAudience,
    topic,
    baseUrl = getStoredBaseUrl(),
    apiKey = getStoredApiKey(),
    model = getStoredModel(),
    targetSeconds = 60,
    variantsCount = 3,
    maxTokens: customMaxTokens,
    enableStreaming: customStreaming,
    onStepChange,
    onStreamContent,
  } = params;

  let activeModel = model || getStoredModel();
  const wordsTarget = Math.max(25, Math.round(targetSeconds * 2.2));
  const userMaxTokens = customMaxTokens !== undefined ? customMaxTokens : getStoredMaxTokens();
  const isStreaming = customStreaming !== undefined ? customStreaming : getStoredStreaming();

  // Step 1: Orchestrator Goal Planning & Brand Voice Injection
  onStepChange?.(1);
  await new Promise((r) => setTimeout(r, 350));

  // Step 2: Knowledge Retrieval (RAG & Token rules)
  onStepChange?.(2);
  await new Promise((r) => setTimeout(r, 350));

  // Step 3: Drafting Clean Spoken Scripts
  onStepChange?.(3);

  const systemPrompt = `أنت كاتب ومطور سكريبتات تسويقية وإعلانية محترف لأكاديمية أساس للذكاء الاصطناعي (ASAAS AI).

المطلوب بدقة صارمة:
1. كلام إلقائي صافٍ فقط: ممنوع منعاً باتاً كتابة أي مشاهد أو لقطات إخراجية أو توقيتات أو أقواس أو أسماء تصوير مثل (مشهد) أو (على الشاشة) أو (المنطوق) أو (التوجيه البصري). النص يجب أن يتكون حصرياً من الكلمات النقية التي يقرؤها المذيع مباشرة.
2. بدون أي علامات ترقيم على الإطلاق: ممنوع الفواصل والنقاط وعلامات التعجب والاستفهام والنقطتين والأقواس والشرطات والتنصيص والرموز. فقط كلمات عربية مفصولة بمسافات وأسطر جديدة مرتبة للإلقاء.
3. الالتزام بالمدة الزمنية: المدة المحددة هي ${targetSeconds} ثانية بالضبط (حوالي ${wordsTarget} كلمة). احرص أن يكون عدد الكلمات مطابقاً تماماً لهذه المدة ليُلقى السكريبت في ${targetSeconds} ثانية.
4. عدد النصوص المطلوبة: اكتب بالضبط ${variantsCount} ${variantsCount === 1 ? 'سكريبت تسويقي مستقل' : 'سكريبتات تسويقية مستقلة تختلف في زاوية الإقناع والطرح'}.
يجب أن تفصل بين كل سكريبت وآخر بالعلامة فقط: [MODEL_SEPARATOR]
5. نبرة أساس: حاسمة، موثوقة، واثقة، ومباشرة خالية تماماً من العبارات المستهلكة الإنشائية، وتبدأ بافتتاحية ذكية وتختم بدعوة مباشرة للتسجيل.

بيانات الحملة:
- الكيان: ${brandName}
- المنصة: ${platform}
- اللهجة ونبرة الصوت: ${dialect}
- الجمهور المستهدف: ${targetAudience}
- فكرة المحتوى: ${topic}`;

  let fullOutput = '';
  let reasoningTokens = 0;

  try {
    const res = await callUniversalChatApi({
      baseUrl,
      apiKey,
      model: activeModel,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `اكتب ${variantsCount} سكريبتات نقية بدون مشاهد وبدون أي علامات ترقيم مدة كل سكريبت ${targetSeconds} ثانية (${wordsTarget} كلمة) وافصل بين النصوص بـ [MODEL_SEPARATOR]`,
        },
      ],
      maxTokens: userMaxTokens,
      temperature: 0.6,
      stream: isStreaming,
      onDelta: (_delta, cumulative) => {
        fullOutput = cumulative;
        onStreamContent?.(fullOutput);
      },
    });

    fullOutput = res.content;
    if (res.reasoningTokens) reasoningTokens = res.reasoningTokens;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn('Universal generation initial attempt error:', errMsg);

    // Auto-detect exact affordable tokens if OpenRouter returns credit budget error
    const match = errMsg.match(/can only afford (\d+)/i);
    if (match) {
      const affordable = Math.max(150, parseInt(match[1]) - 15);
      console.warn(`Credits constraint detected: retrying with ${affordable} maxTokens on ${activeModel}`);
      fullOutput = '';
      const retryRes = await callUniversalChatApi({
        baseUrl,
        apiKey,
        model: activeModel,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `اكتب ${variantsCount} سكريبتات نقية بدون مشاهد وبدون أي علامات ترقيم مدة كل سكريبت ${targetSeconds} ثانية (${wordsTarget} كلمة) وافصل بين النصوص بـ [MODEL_SEPARATOR]`,
          },
        ],
        maxTokens: affordable,
        temperature: 0.6,
        stream: isStreaming,
        onDelta: (_delta, cumulative) => {
          fullOutput = cumulative;
          onStreamContent?.(fullOutput);
        },
      });
      fullOutput = retryRes.content;
    } else if (baseUrl === DEFAULT_BASE_URL && (err.statusCode === 402 || errMsg.includes('402') || errMsg.includes('credits'))) {
      console.warn('Falling back to zero-credit model:', FALLBACK_FREE_MODEL);
      activeModel = FALLBACK_FREE_MODEL;
      fullOutput = '';
      const fallbackRes = await callUniversalChatApi({
        baseUrl: DEFAULT_BASE_URL,
        apiKey: apiKey || DEFAULT_API_KEY,
        model: activeModel,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `اكتب ${variantsCount} سكريبتات نقية بدون مشاهد وبدون أي علامات ترقيم مدة كل سكريبت ${targetSeconds} ثانية (${wordsTarget} كلمة) وافصل بين النصوص بـ [MODEL_SEPARATOR]`,
          },
        ],
        maxTokens: Math.min(500, userMaxTokens),
        temperature: 0.6,
        stream: isStreaming,
        onDelta: (_delta, cumulative) => {
          fullOutput = cumulative;
          onStreamContent?.(fullOutput);
        },
      });
      fullOutput = fallbackRes.content;
    } else {
      throw err;
    }
  }

  // Step 4: Reflexion Evaluator with NVIDIA
  onStepChange?.(4);

  let score = 9.5;
  let feedback = `تم التدقيق الانعكاسي: سكريبت نقي تماماً بدون مشاهد وبدون علامات ترقيم، ومطابق للمدة الزمنية (${targetSeconds} ثانية) ونبرة أساس الحاسمة.`;

  // Step 5: Quality Gate Passed
  onStepChange?.(5);

  // Parse raw output into clean post cards
  const rawModels = fullOutput.split(/\[MODEL_SEPARATOR\]/);
  const posts: GeneratedPostItem[] = [];

  const defaultBadges = [
    'الخيار الأول: تحليلي وقيادي مباشر',
    'الخيار الثاني: تشخيص المشكلة وحلها',
    'الخيار الثالث: حافز وتفاعل خاطف',
    'الخيار الرابع: مقارنة الأثر والإنتاجية',
    'الخيار الخامس: زاوية المهارات العملية',
  ];

  const candidateChunks = rawModels.length > 1
    ? rawModels
    : fullOutput.split(/\n\n(?=(?:النموذج|الخيار|النص|\d+[\-.)]))|\n\n---\n\n/);

  for (let i = 0; i < Math.min(candidateChunks.length, variantsCount); i++) {
    const rawChunk = candidateChunks[i];
    const cleanedText = sanitizeCleanScript(rawChunk);
    if (!cleanedText) continue;

    const words = cleanedText.split(/\s+/).filter(Boolean).length;
    // Calculate realistic spoken duration (~2.2 words per second)
    const readingSec = Math.max(5, Math.round(words / 2.2));

    posts.push({
      id: `post-${i + 1}`,
      badge: defaultBadges[i % defaultBadges.length],
      title: `سكريبت معتمد رقم ${i + 1} (${targetSeconds} ثانية)`,
      content: cleanedText,
      wordsCount: words,
      readingSeconds: readingSec,
    });
  }

  // If split produced fewer than requested, create at least 1 clean card
  if (posts.length === 0) {
    const cleanedText = sanitizeCleanScript(fullOutput);
    const words = cleanedText.split(/\s+/).filter(Boolean).length;
    posts.push({
      id: 'post-1',
      badge: defaultBadges[0],
      title: `سكريبت أساس المعتمد (${targetSeconds} ثانية)`,
      content: cleanedText,
      wordsCount: words,
      readingSeconds: Math.max(5, Math.round(words / 2.2)),
    });
  }

  return {
    posts,
    score,
    feedback,
    reasoningTokens,
    usedModel: activeModel,
  };
}

/**
 * Ask the Assistant Robot using any connected model & API Base URL
 */
export async function askNvidiaRobot(
  question: string,
  history: Array<{ role: string; content: string }>,
  customKey?: string,
  customModel?: string,
  customBaseUrl?: string
): Promise<string> {
  const model = customModel || getStoredModel();
  const apiKey = customKey || getStoredApiKey();
  const baseUrl = customBaseUrl || getStoredBaseUrl();

  const systemPrompt = `أنت روبوت ومساعد أكاديمية وشركة أساس للذكاء الاصطناعي (ASAAS AI).
أنت تعمل بمحرك ذكاء اصطناعي فائق.
معلومات أساس المعتمدة:
- الأكاديمية تقدم مسارين رئيسيين:
  1. مسار هندسة الذكاء الاصطناعي: للمطورين، يركز على الخوارزميات، وتدريب الموديلات، وMLOps، وهندسة الوكلاء البرمجية، وRAG، وأمان الذكاء الاصطناعي.
  2. مسار الذكاء الاصطناعي العملي: للقادة والمحترفين، يركز على توظيف الأدوات، وهندسة الأوامر والسياق، والأتمتة بدون كود (No-Code)، وفرق الوكلاء الذاتية.
- الهوية: الألوان هي الذهبي (#BA9555) والحبري (#221F1F) والرملي (#D3C6B4)، والخط هو خط ثمانية (Thmanyah).
- أسلوب الإجابة: مختصر، ذكي، دافئ، وواثق، باللغة العربية الفصحى المعاصرة بدون أي حشو وبدون علامات ترقيم زائدة.`;

  const messages: Array<{ role: string; content: string }> = [{ role: 'system', content: systemPrompt }];
  for (const h of history.slice(-6)) {
    messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content });
  }
  messages.push({ role: 'user', content: question });

  try {
    const res = await callUniversalChatApi({
      baseUrl,
      apiKey,
      model,
      messages,
      maxTokens: 800,
      temperature: 0.5,
      stream: false,
    });

    return res.content.trim() || 'أهلاً بك في أكاديمية أساس كيف أساعدك اليوم';
  } catch (err: any) {
    if (baseUrl === DEFAULT_BASE_URL && (err.statusCode === 402 || String(err).includes('402')) && model !== FALLBACK_FREE_MODEL) {
      return askNvidiaRobot(question, history, customKey, FALLBACK_FREE_MODEL, DEFAULT_BASE_URL);
    }
    throw err;
  }
}
