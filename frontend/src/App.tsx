import { useEffect, useState } from 'react';
import {
  AssistantWidget,
  Button,
  Card,
  Field,
  Glass,
  Icon,
  Modal,
  ProgressBar,
  Select,
  StatusPill,
  Swash,
  TextArea,
  TextInput,
  useTheme,
  useToast,
} from './asaas-ui';
import {
  chatWithAgentAssistant,
  DEFAULT_BASE_URL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MODEL,
  DEFAULT_STREAMING,
  fetchAgentArchitecture,
  fetchAgentRunDetail,
  fetchAgentRuns,
  generateContentViaAgent,
  getStoredApiKey,
  getStoredBaseUrl,
  getStoredMaxTokens,
  getStoredModel,
  getStoredStreaming,
  POPULAR_PROVIDERS,
  setStoredApiKey,
  setStoredBaseUrl,
  setStoredMaxTokens,
  setStoredModel,
  setStoredStreaming,
  testAgentConnection,
  type AgentRunSummary,
  type AgentStepTrace,
  type ArchitectureInfo,
  type GeneratedPostItem,
} from './lib/agentApi';
import './App.css';

const PLATFORM_OPTIONS = [
  { value: 'TikTok / Reels (سكريبت فيديو قصير 60 ثانية)', label: 'TikTok / Reels (فيديو قصير)' },
  { value: 'LinkedIn (منشور مهني تحليلي رصين)', label: 'LinkedIn (منشور مهني تحليلي)' },
  { value: 'X / Twitter (ثريد ومنشورات مكثفة وقوية)', label: 'X / Twitter (ثريد ومكثف)' },
  { value: 'Instagram (محتوى بصري وقصصي ملهم)', label: 'Instagram (بصري وملهم)' },
  { value: 'Facebook (محتوى تفاعلي مجتمعي موسع)', label: 'Facebook (تفاعلي مجتمعي)' },
];

const DIALECT_OPTIONS = [
  { value: 'عربية فصحى معاصرة رصينة (نبرة أساس المؤسسية)', label: 'عربية فصحى معاصرة رصينة (نبرة أساس المؤسسية)' },
  { value: 'لهجة سعودية / خليجية بيضاء مهنية', label: 'لهجة سعودية / خليجية بيضاء مهنية' },
  { value: 'لهجة مصرية تفاعلية راقية وعفوية', label: 'لهجة مصرية تفاعلية راقية وعفوية' },
  { value: 'لهجة شامية مبسطة معاصرة', label: 'لهجة شامية مبسطة معاصرة' },
  { value: 'أسلوب تقني مباشر مدعوم بالأرقام والحقائق (Data-Driven)', label: 'أسلوب تقني مباشر مدعوم بالأرقام والحقائق (Data-Driven)' },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 ثانية (خاطف وسريع ~ 30 كلمة)' },
  { value: 30, label: '30 ثانية (إيقاع مكثف ~ 65 كلمة)' },
  { value: 45, label: '45 ثانية (متوازن ~ 100 كلمة)' },
  { value: 60, label: '60 ثانية (ريلز قياسي ~ 130 كلمة)' },
  { value: 90, label: '90 ثانية (مفصل وموسع ~ 200 كلمة)' },
  { value: 120, label: '120 ثانية (دقيقتان كاملتان ~ 260 كلمة)' },
];

const VARIANTS_OPTIONS = [
  { value: 1, label: '1 سكريبت (نسخة مركزة واحدة)' },
  { value: 2, label: '2 سكريبتات (نسختان للمقارنة)' },
  { value: 3, label: '3 سكريبتات (ثلاث زوايا متباينة)' },
  { value: 4, label: '4 سكريبتات (أربعة خيارات متنوعة)' },
  { value: 5, label: '5 سكريبتات (خمسة بدائل إبداعية)' },
];

const PRESET_TOPICS = [
  'الفرق بين مسار هندسة الذكاء الاصطناعي ومسار الذكاء الاصطناعي العملي في أكاديمية أساس',
  'بناء وكلاء ذكاء اصطناعي برمجياً عبر Vibe Coding بدلاً من أدوات الربط التقليدية',
  'كيف ترفع إنتاجية فريقك 4 أضعاف باستخدام هندسة الأوامر ووكلاء التقييم الانعكاسي',
  'بناء حلول الذكاء الاصطناعي أم استخدامها؟ خارطة الطريق لعام 2026',
];

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const notify = useToast();

  const [brandName, setBrandName] = useState('الفرق بين هندسة الذكاء الاصطناعي والذكاء الاصطناعي العملي');
  const [platform, setPlatform] = useState(PLATFORM_OPTIONS[0].value);
  const [dialect, setDialect] = useState(DIALECT_OPTIONS[0].value);
  const [targetAudience, setTargetAudience] = useState('');
  const [targetSeconds, setTargetSeconds] = useState<number>(60);
  const [variantsCount, setVariantsCount] = useState<number>(3);
  const [topic, setTopic] = useState(PRESET_TOPICS[0]);

  // Provider configuration (sent cleanly to the FastAPI LLM boundary)
  const [baseUrl, setBaseUrl] = useState<string>(getStoredBaseUrl());
  const [apiKey, setApiKey] = useState<string>(getStoredApiKey());
  const [selectedModel, setSelectedModel] = useState<string>(getStoredModel());
  const [maxTokens, setMaxTokens] = useState<number>(getStoredMaxTokens());
  const [enableStreaming, setEnableStreaming] = useState<boolean>(getStoredStreaming());
  const [showKeyText, setShowKeyText] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Generation & Agent state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentStepLabel, setCurrentStepLabel] = useState('');
  const [liveStreamText, setLiveStreamText] = useState('');
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [evaluatorFeedback, setEvaluatorFeedback] = useState<string>('');
  const [actualModelUsed, setActualModelUsed] = useState<string>(getStoredModel());
  const [runMeta, setRunMeta] = useState<{
    runId: number;
    promptVersion: string;
    iterations: number;
    stopReason: string;
    toolsUsed: string[];
    latencyMs: number;
    trace: AgentStepTrace[];
  } | null>(null);
  const [posts, setPosts] = useState<GeneratedPostItem[]>([]);

  // Modals & Backend Data
  const [showArchModal, setShowArchModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showRunsModal, setShowRunsModal] = useState(false);
  const [architecture, setArchitecture] = useState<ArchitectureInfo | null>(null);
  const [runsHistory, setRunsHistory] = useState<AgentRunSummary[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);

  useEffect(() => {
    setStoredApiKey(apiKey);
    setStoredBaseUrl(baseUrl);
    setStoredModel(selectedModel);
    setStoredMaxTokens(maxTokens);
    setStoredStreaming(enableStreaming);
  }, [apiKey, baseUrl, selectedModel, maxTokens, enableStreaming]);

  useEffect(() => {
    fetchAgentArchitecture()
      .then(setArchitecture)
      .catch(() => {
        // Backend may still be booting; architecture modal handles fallback gracefully
      });
  }, []);

  const openRunsModal = async () => {
    setShowRunsModal(true);
    setLoadingRuns(true);
    try {
      const list = await fetchAgentRuns(20);
      setRunsHistory(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر تحميل سجل التشغيل من الخادم.';
      notify(msg, 'error');
    } finally {
      setLoadingRuns(false);
    }
  };

  const handleLoadRun = async (runId: number) => {
    try {
      const detail = await fetchAgentRunDetail(runId);
      setBrandName(detail.brand_name);
      setPlatform(detail.platform);
      setDialect(detail.dialect);
      setTargetAudience(detail.target_audience);
      setTopic(detail.topic);
      setTargetSeconds(detail.target_seconds);
      setVariantsCount(detail.variants_count);
      setPosts(detail.posts);
      setQualityScore(detail.tone_score);
      setEvaluatorFeedback(detail.evaluator_feedback);
      setActualModelUsed(detail.used_model);
      setRunMeta({
        runId: detail.id,
        promptVersion: detail.prompt_version,
        iterations: detail.iterations,
        stopReason: detail.stop_reason,
        toolsUsed: detail.tools_used,
        latencyMs: detail.latency_ms,
        trace: detail.trace,
      });
      setCurrentStep(5);
      setShowRunsModal(false);
      notify(`تم استرجاع الجلسة #${detail.id} بنجاح من قاعدة البيانات.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر فتح السجل.';
      notify(msg, 'error');
    }
  };

  const handleCopy = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    notify(`تم نسخ ${title} بنجاح إلى الحافظة!`);
  };

  const handleTestApiKey = async () => {
    setIsTestingKey(true);
    setApiTestStatus(null);
    try {
      const res = await testAgentConnection({
        baseUrl,
        apiKey,
        model: selectedModel.trim(),
      });
      setApiTestStatus({ success: res.success, message: res.message });
      if (res.success) {
        notify(`الاتصال ناجح عبر بوابة الوكيل (${res.latency_ms}ms)!`);
      } else {
        notify(`فشل الاتصال: ${res.message}`, 'error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ في الاتصال بالخادم الخلفي';
      setApiTestStatus({ success: false, message: msg });
      notify(msg, 'error');
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setCurrentStep(1);
    setCurrentStepLabel('تهيئة حالة الوكيل وسياج الأمان...');
    setLiveStreamText('');
    setQualityScore(null);
    setRunMeta(null);

    try {
      const result = await generateContentViaAgent({
        brandName,
        platform,
        dialect,
        targetAudience,
        topic,
        baseUrl,
        apiKey,
        model: selectedModel.trim(),
        targetSeconds,
        variantsCount,
        maxTokens,
        enableStreaming,
        onStepChange: (step, label) => {
          setCurrentStep(step);
          if (label) setCurrentStepLabel(label);
        },
        onStreamContent: (stream, model) => {
          setLiveStreamText(stream);
          if (model) setActualModelUsed(model);
          const container = document.getElementById('live-stream-container');
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        },
      });

      setPosts(result.posts);
      setQualityScore(result.score);
      setEvaluatorFeedback(result.feedback);
      setActualModelUsed(result.used_model);
      setCurrentStep(5);
      setRunMeta({
        runId: result.run_id,
        promptVersion: result.prompt_version,
        iterations: result.iterations,
        stopReason: result.stop_reason,
        toolsUsed: result.tools_used,
        latencyMs: result.latency_ms,
        trace: result.trace,
      });
      notify(`اكتمل توليد ${result.posts.length} سكريبتات نقية وحفظها في السجل #${result.run_id}!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.includes('403') || msg.includes('مفتاح API')) {
        setShowApiModal(true);
      }
      notify(`حدث خطأ أثناء التوليد: ${msg}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-container">
      {/* ───────── Top Navigation Header ───────── */}
      <Glass as="header" thick pill className="top-nav">
        <div className="top-nav__brand">
          <img src="/brand/logo.png" alt="ASAAS Logo" className="brand-logo-img" width={42} height={42} />
          <div className="top-nav__title-group">
            <h1>
              <Swash>أساس للذكاء الاصطناعي</Swash>
            </h1>
            <span className="app-subtitle">استوديو صياغة السكريبتات التسويقية الذكية</span>
          </div>
        </div>

        <div className="top-nav__actions">
          <button
            type="button"
            className="badge-live-agent"
            onClick={() => setShowApiModal(true)}
            style={{ cursor: 'pointer' }}
            title="إعدادات مزود الذكاء الاصطناعي والنموذج"
          >
            <span className="live-pulse" />
            {selectedModel.split('/').pop()}
          </button>

          <Button variant="ghost" size="sm" icon="edit" onClick={() => setShowApiModal(true)}>
            إعدادات API والمودل
          </Button>

          <Button variant="ghost" size="sm" icon="clock" onClick={openRunsModal}>
            سجل التشغيل
          </Button>

          <Button variant="ghost" size="sm" icon="file" onClick={() => setShowArchModal(true)}>
            معمارية الوكيل
          </Button>

          <Button variant="glass" size="sm" icon="sun" onClick={toggleTheme}>
            {theme === 'dark' ? 'النهار' : 'الليل'}
          </Button>
        </div>
      </Glass>

      {/* ───────── Stats Overview Tiles ───────── */}
      <div className="stats-summary">
        <Glass className="stat-tile">
          <div className="stat-tile__header">
            <span>محرك الوكيل الذكي</span>
            <div className="stat-tile__icon-box">
              <Icon name="sparkle" />
            </div>
          </div>
          <div className="stat-tile__value">ASAAS Agent</div>
          <div className="stat-tile__footer">AI-ASAAS Skills</div>
        </Glass>

        <Glass className="stat-tile">
          <div className="stat-tile__header">
            <span>المدة وعدد النصوص</span>
            <div className="stat-tile__icon-box">
              <Icon name="clock" />
            </div>
          </div>
          <div className="stat-tile__value">
            <span className="num">{targetSeconds}</span> ثانية | <span className="num">{variantsCount}</span> نصوص
          </div>
          <div className="stat-tile__footer">كلام نقي مخصص للإلقاء الفوري</div>
        </Glass>

        <Glass className="stat-tile">
          <div className="stat-tile__header">
            <span>الناقد الانعكاسي</span>
            <div className="stat-tile__icon-box">
              <Icon name="checkCircle" />
            </div>
          </div>
          <div className="stat-tile__value">Reflexion Gate</div>
          <div className="stat-tile__footer">Pydantic Structured Output + سقف جولتين</div>
        </Glass>

        <Glass className="stat-tile">
          <div className="stat-tile__header">
            <span>المنصة واللهجة</span>
            <div className="stat-tile__icon-box">
              <Icon name="trend" />
            </div>
          </div>
          <div className="stat-tile__value" style={{ fontSize: 16 }}>
            {platform.split(' ')[0]}
          </div>
          <div className="stat-tile__footer">{dialect.split(' ')[0]}</div>
        </Glass>
      </div>

      {/* ───────── Main Studio: Form & Live Agent Progress ───────── */}
      <div className="grid grid--main">
        <Card title="استوديو ضبط السكريبت والحملة" icon="edit">
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerate();
            }}
          >
            <div className="custom-range-row">
              <Field label="تحديد مدة السكريبت بالثواني (Target Duration)">
                {(id) => (
                  <Select
                    id={id}
                    value={targetSeconds}
                    onChange={(e) => setTargetSeconds(Number(e.target.value))}
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="عدد النصوص المولدة (Generated Variants)">
                {(id) => (
                  <Select
                    id={id}
                    value={variantsCount}
                    onChange={(e) => setVariantsCount(Number(e.target.value))}
                  >
                    {VARIANTS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <div className="form__row">
              <Field label="المنصة المستهدفة (Platform)">
                {(id) => (
                  <Select id={id} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                    {PLATFORM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="اللهجة ونبرة الصوت (Dialect & Tone)">
                {(id) => (
                  <Select id={id} value={dialect} onChange={(e) => setDialect(e.target.value)}>
                    {DIALECT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <div className="form__row">
              <Field label="عنوان الفيديو (Video Title)">
                {(id) => (
                  <TextInput
                    id={id}
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="اكتب عنوان الفيديو هنا..."
                    required
                  />
                )}
              </Field>

              <Field label="الجمهور المستهدف (Target Audience)">
                {(id) => (
                  <TextInput
                    id={id}
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="مثال: رواد الأعمال، المطورون، طلاب الجامعات..."
                    required
                  />
                )}
              </Field>
            </div>

            <Field
              label="فكرة الحملة أو موضوع السكريبت (Campaign Topic / Prompt)"
              hint="يُولَّد الكلام المنطوق الصافي عبر وكيل Python FastAPI مع فحص حتمي وهيكلي وفق مهارات أساس"
            >
              {(id) => (
                <TextArea
                  id={id}
                  rows={3}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="اكتب فكرة السكريبت هنا..."
                  required
                />
              )}
            </Field>

            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>أفكار جاهزة للتوليد الفوري:</span>
              <div className="chips-row">
                {PRESET_TOPICS.map((p, idx) => (
                  <button key={idx} type="button" className="chip-btn" onClick={() => setTopic(p)}>
                    {p.length > 50 ? `${p.substring(0, 50)}...` : p}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <Button type="submit" variant="primary" icon="sparkle" loading={isGenerating}>
                توليد السكريبتات النقية ({variantsCount} نصوص | {targetSeconds} ثانية)
              </Button>
            </div>
          </form>
        </Card>

        {/* Right Column: Live Vibe-Coded Agent Pipeline */}
        <Card title={`مراحل التوليد والتدقيق (${selectedModel.split('/').pop()})`} icon="sparkle">
          <div className="pipeline-timeline">
            <div
              className={`pipeline-step ${currentStep === 1 ? 'pipeline-step--active' : currentStep > 1 ? 'pipeline-step--done' : ''}`}
            >
              <div className="step-marker">{currentStep > 1 ? '✓' : '1'}</div>
              <div className="step-content">
                <div className="step-title">تهيئة الحالة والتحقق (Pydantic Guardrails)</div>
                <div className="step-desc">
                  فحص المدخلات وضبط سقف التكرار وحساب ميزانية الكلمات (~{Math.round(targetSeconds * 2.2)} كلمة).
                </div>
              </div>
            </div>

            <div
              className={`pipeline-step ${currentStep === 2 ? 'pipeline-step--active' : currentStep > 2 ? 'pipeline-step--done' : ''}`}
            >
              <div className="step-marker">{currentStep > 2 ? '✓' : '2'}</div>
              <div className="step-content">
                <div className="step-title">تشغيل أدوات الهوية والذاكرة (Read-Only Tools)</div>
                <div className="step-desc">
                  استدعاء أدوات هوية أساس وقواعد المنصة واللهجة وأحدث النماذج المعتمدة من SQLite.
                </div>
              </div>
            </div>

            <div
              className={`pipeline-step ${currentStep === 3 ? 'pipeline-step--active' : currentStep > 3 ? 'pipeline-step--done' : ''}`}
            >
              <div className="step-marker">{currentStep > 3 ? '✓' : '3'}</div>
              <div className="step-content">
                <div className="step-title">الوكيل المنسق عبر بوابة httpx الموحدة</div>
                <div className="step-desc">
                  صياغة {variantsCount} سكريبتات نقية عبر برومبت مُصدّر (content-orchestrator@1) بمحرك {actualModelUsed.split('/').pop()}.
                </div>
              </div>
            </div>

            <div
              className={`pipeline-step ${currentStep === 4 ? 'pipeline-step--active' : currentStep > 4 ? 'pipeline-step--done' : ''}`}
            >
              <div className="step-marker">{currentStep > 4 ? '✓' : '4'}</div>
              <div className="step-content">
                <div className="step-title">التنظيف الحتمي والناقد الانعكاسي (Reflexion)</div>
                <div className="step-desc">
                  فحص برمجي + تقييم هيكلي بـ Pydantic من 10 درجات مع إعادة تلقائية عند انخفاض الدرجة عن 8.
                </div>
              </div>
            </div>

            <div
              className={`pipeline-step ${currentStep === 5 ? 'pipeline-step--active' : currentStep > 5 ? 'pipeline-step--done' : ''}`}
            >
              <div className="step-marker">{currentStep >= 5 ? '✓' : '5'}</div>
              <div className="step-content">
                <div className="step-title">اعتماد المخرجات وحفظ السجل في SQLite</div>
                <div className="step-desc">
                  {currentStepLabel || 'توثيق الجلسة في data/app.db وإخراج السكريبتات جاهزة للإلقاء الصوتي.'}
                </div>
              </div>
            </div>
          </div>

          {qualityScore !== null && (
            <div className="score-box" style={{ marginTop: 14 }}>
              <div className="score-number">{qualityScore}</div>
              <div className="score-details">
                <h4>اعتماد السكريبت النقي (Clean Script Approved)</h4>
                <p>{evaluatorFeedback}</p>
                {runMeta && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>السجل: <b>#{runMeta.runId}</b></span>
                    <span>الجولات: <b>{runMeta.iterations}</b></span>
                    <span>البرومبت: <code>{runMeta.promptVersion}</code></span>
                    <span>الزمن: <b>{runMeta.latencyMs}ms</b></span>
                  </div>
                )}
                <div style={{ marginTop: 6 }}>
                  <ProgressBar value={qualityScore} max={10} />
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ───────── Live Real-time Streaming Theater ───────── */}
      {(isGenerating || liveStreamText) && (
        <section className="live-stream-theater">
          <div className="live-stream-theater__header">
            <div className="live-stream-theater__title">
              <span
                className="live-pulse"
                style={{
                  background: isGenerating ? '#ef4444' : '#16a34a',
                  boxShadow: isGenerating ? '0 0 10px #ef4444' : '0 0 10px #16a34a',
                }}
              />
              <span>شاشة البث الحي والتوليد المباشر (SSE Stream)</span>
              <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>({actualModelUsed})</span>
            </div>
            <div className="live-stream-theater__stats">
              <span className="live-stat-pill">
                الكلمات المكتوبة:{' '}
                <b className="num" style={{ color: 'var(--accent)' }}>
                  {liveStreamText.split(/\s+/).filter(Boolean).length}
                </b>
              </span>
              <span className="live-stat-pill">
                المستهدف: <b className="num">{targetSeconds}</b> ثانية (~<b className="num">{Math.round(targetSeconds * 2.2)}</b> كلمة)
              </span>
              <span className="live-stat-pill">
                الحالة: {isGenerating ? 'جارٍ التوليد الحي عبر FastAPI...' : 'اكتمل البث والتدقيق'}
              </span>
            </div>
          </div>

          <div className="live-stream-theater__body" id="live-stream-container">
            {liveStreamText || 'جاري تشغيل أدوات الوكيل والاتصال بالنموذج لبدء التدفق المباشر...'}
            {isGenerating && <span className="live-cursor" />}
          </div>
        </section>
      )}

      {/* ───────── Generated Clean Scripts Showcase ───────── */}
      {posts.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="toolbar">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: 0 }}>
              <Swash>السكريبتات النقية المعتمدة</Swash> (كلام إلقائي بدون مشاهد وبدون علامات ترقيم)
            </h3>
            <div className="toolbar__actions">
              <Button
                variant="glass"
                size="sm"
                icon="receipt"
                onClick={() => {
                  const allText = posts.map((p) => `=== ${p.title} ===\n\n${p.content}`).join('\n\n\n');
                  handleCopy(allText, 'جميع السكريبتات');
                }}
              >
                نسخ جميع السكريبتات دفعة واحدة
              </Button>
            </div>
          </div>

          <div className="grid grid--halves" style={{ gap: 20 }}>
            {posts.map((post) => (
              <Glass key={post.id} className="draft-card">
                <div className="draft-card__badge-row">
                  <span className="draft-model-tag">{post.badge}</span>
                  <StatusPill status="paid" />
                </div>

                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 18, margin: 0 }}>{post.title}</h4>

                <div className="draft-card__body">{post.content}</div>

                <div className="draft-card__footer">
                  <div className="draft-meta-text">
                    <span>
                      الكلمات: <b className="num">{post.words_count}</b>
                    </span>
                    <span>
                      وقت الإلقاء المقدر: ~<b className="num">{post.reading_seconds}</b> ثانية
                    </span>
                    <span>بدون مشاهد وبدون علامات ترقيم</span>
                  </div>

                  <Button
                    variant="glass"
                    size="sm"
                    icon="checkCircle"
                    onClick={() => handleCopy(post.content, post.title)}
                  >
                    نسخ النص
                  </Button>
                </div>
              </Glass>
            ))}
          </div>
        </section>
      )}

      {/* ───────── API & Model Settings Modal ───────── */}
      {showApiModal && (
        <Modal
          title="إعدادات الـ API ومحرك التوليد (عبر بوابة الوكيل الموحدة)"
          onClose={() => {
            setShowApiModal(false);
            setApiTestStatus(null);
          }}
          footer={
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                onClick={() => {
                  setStoredBaseUrl(baseUrl);
                  setStoredApiKey(apiKey);
                  setStoredModel(selectedModel);
                  setStoredMaxTokens(maxTokens);
                  setStoredStreaming(enableStreaming);
                  notify('تم حفظ كافة إعدادات الـ API بنجاح!');
                  setShowApiModal(false);
                  setApiTestStatus(null);
                }}
              >
                حفظ التغييرات
              </Button>
              <Button variant="glass" onClick={handleTestApiKey} loading={isTestingKey}>
                اختبار الاتصال
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setBaseUrl(DEFAULT_BASE_URL);
                  setApiKey('');
                  setSelectedModel(DEFAULT_MODEL);
                  setMaxTokens(DEFAULT_MAX_TOKENS);
                  setEnableStreaming(DEFAULT_STREAMING);
                  notify('تمت استعادة القيم الافتراضية بنجاح');
                }}
              >
                استعادة الافتراضي
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowApiModal(false);
                  setApiTestStatus(null);
                }}
              >
                إغلاق
              </Button>
            </div>
          }
          wide
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: 'var(--accent-glow)',
                border: '1px solid var(--accent-fill)',
                fontSize: 13,
                color: 'var(--text-1)',
                lineHeight: 1.6,
              }}
            >
              <b>بوابة مزود موحدة (ASAAS AI Skill):</b> تمر كافة الاستدعاءات عبر خادم FastAPI باستخدام عميل <code>httpx</code> واحد مع منع جمع البيانات في OpenRouter، ويمكنك ضبط مفتاحك هنا أو في ملف <code>.env</code> على السيرفر.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                اختيار سريع لمزود الخدمة:
              </span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 8,
                }}
              >
                {POPULAR_PROVIDERS.map((p) => {
                  const isCurrent = baseUrl.trim() === p.baseUrl;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`model-chip ${isCurrent ? 'model-chip--active' : ''}`}
                      style={{
                        padding: '8px 10px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                        borderRadius: 10,
                      }}
                      onClick={() => {
                        setBaseUrl(p.baseUrl);
                        setSelectedModel(p.defaultModel);
                        notify(`تم اختيار مزود: ${p.name}`);
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 12.5 }}>{p.name}</span>
                      <span style={{ fontSize: 10, opacity: 0.8, fontFamily: 'monospace' }}>{p.defaultModel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Field
              label="رابط الـ API الأساسي (API Base URL)"
              hint="أي رابط متوافق مع OpenAI Chat Completions (يدعم السحابة و Ollama المحلي)"
            >
              {(id) => (
                <TextInput
                  id={id}
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://openrouter.ai/api/v1"
                  style={{ fontFamily: 'monospace', fontSize: 13.5 }}
                />
              )}
            </Field>

            <Field
              label="مفتاح الـ API (اختياري إذا كان مضبوطاً في .env على السيرفر)"
              hint="اتركه فارغاً لاستخدام المفتاح المضبوط على السيرفر أو للاتصال بـ Ollama محلياً"
            >
              {(id) => (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    id={id}
                    type={showKeyText ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-... أو اتركه فارغاً لمفتاح السيرفر"
                    style={{ flex: 1, fontFamily: 'monospace' }}
                  />
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    icon="eye"
                    onClick={() => setShowKeyText(!showKeyText)}
                  >
                    {showKeyText ? 'إخفاء' : 'إظهار'}
                  </Button>
                </div>
              )}
            </Field>

            <Field label="معرّف النموذج (AI Model ID)">
              {(id) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <TextInput
                    id={id}
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    placeholder="google/gemini-2.5-flash"
                    style={{ fontFamily: 'monospace', fontSize: 14 }}
                  />
                  <div className="model-suggestions-row">
                    {[
                      { id: 'google/gemma-4-31b-it:free', label: 'gemma-4-31b (مجاني)' },
                      { id: 'google/gemma-4-26b-a4b-it:free', label: 'gemma-4-26b (مجاني سريع)' },
                      { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'nemotron-3-ultra (مجاني)' },
                      { id: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash' },
                      { id: 'openai/gpt-4o-mini', label: 'gpt-4o-mini' },
                      { id: 'llama3.2', label: 'llama3.2 (Ollama)' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`model-chip ${selectedModel === m.id ? 'model-chip--active' : ''}`}
                        onClick={() => setSelectedModel(m.id)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Field>

            <Field label="سقف التوكنات (Max Tokens Budget)">
              {(id) => (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextInput
                    id={id}
                    type="number"
                    min={200}
                    max={8000}
                    step={100}
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value) || DEFAULT_MAX_TOKENS)}
                    style={{ maxWidth: 160, fontFamily: 'monospace', fontWeight: 700 }}
                  />
                  {[800, 1200, 1800, 2500].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`chip-btn ${maxTokens === t ? 'chip-btn--active' : ''}`}
                      onClick={() => setMaxTokens(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </Field>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 12,
                background: 'var(--glass-inset)',
                border: '1px solid var(--hairline)',
                cursor: 'pointer',
              }}
              onClick={() => setEnableStreaming(!enableStreaming)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>البث المباشر (FastAPI SSE Streaming)</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  {enableStreaming
                    ? 'مفعل: عرض الكلمات ومراحل الوكيل لحظة بلحظة عبر Server-Sent Events'
                    : 'معطل: انتظار اكتمال دورة التوليد والتقييم بالكامل ثم إظهار النتيجة'}
                </span>
              </div>
              <div
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: enableStreaming ? '#16a34a' : 'var(--hairline)',
                  position: 'relative',
                  transition: 'background 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: 3,
                    left: enableStreaming ? 22 : 4,
                    transition: 'left 0.2s ease',
                  }}
                />
              </div>
            </div>

            {apiTestStatus && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  background: apiTestStatus.success ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: `1px solid ${apiTestStatus.success ? '#16a34a' : '#ef4444'}`,
                  color: apiTestStatus.success ? '#16a34a' : '#ef4444',
                  fontWeight: 600,
                }}
              >
                {apiTestStatus.message}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ───────── SQLite Runs History Modal ───────── */}
      {showRunsModal && (
        <Modal
          title="سجل جلسات الوكيل (SQLite data/app.db)"
          onClose={() => setShowRunsModal(false)}
          footer={
            <Button variant="ghost" onClick={() => setShowRunsModal(false)}>
              إغلاق
            </Button>
          }
          wide
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loadingRuns ? (
              <p style={{ color: 'var(--text-3)' }}>جاري تحميل سجل الجلسات من قاعدة البيانات...</p>
            ) : runsHistory.length === 0 ? (
              <p style={{ color: 'var(--text-3)' }}>لا توجد جلسات محفوظة بعد. قم بتوليد أول سكريبت ليُحفظ تلقائياً في SQLite.</p>
            ) : (
              runsHistory.map((run) => (
                <div
                  key={run.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'var(--glass-inset)',
                    border: '1px solid var(--hairline)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      #{run.id} — {run.topic.length > 75 ? `${run.topic.slice(0, 75)}...` : run.topic}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span>المنصة: {run.platform.split(' ')[0]}</span>
                      <span>التقييم: <b>{run.tone_score}/10</b></span>
                      <span>الجولات: {run.iterations}</span>
                      <span>النموذج: <code>{run.used_model.split('/').pop()}</code></span>
                      <span>{run.created_at}</span>
                    </div>
                  </div>
                  <Button variant="glass" size="sm" onClick={() => handleLoadRun(run.id)}>
                    استرجاع النتائج
                  </Button>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* ───────── Vibe-Coded Agent Architecture Modal ───────── */}
      {showArchModal && (
        <Modal
          title="معمارية الوكيل البرمجي (Vibe-Coded Agent & AI-ASAAS Skills)"
          onClose={() => setShowArchModal(false)}
          footer={
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                onClick={() => window.open('https://github.com/AI-ASAAS/skills', '_blank', 'noopener,noreferrer')}
              >
                مستودع مهارات AI-ASAAS
              </Button>
              <Button
                variant="glass"
                onClick={() => {
                  const docsUrl = window.location.port === '5180' ? 'http://localhost:8085/docs' : `${window.location.origin}/docs`;
                  window.open(docsUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                توثيق FastAPI (Swagger)
              </Button>
              <Button variant="ghost" onClick={() => setShowArchModal(false)}>
                إغلاق
              </Button>
            </div>
          }
          wide
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                color: '#16a34a',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span className="live-pulse" />
              تم استبدال n8n بالكامل بوكيل برمجي نظيف (Vibe-Coded Python FastAPI) مطابق لمهارات AI-ASAAS/skills
            </div>

            <div style={{ background: 'var(--glass-inset)', padding: 14, borderRadius: 12, fontSize: 13 }}>
              <div><b>المحرك:</b> {architecture?.engine || 'ASAAS Vibe-Coded Python Agent (FastAPI + Pydantic + SQLite)'}</div>
              <div style={{ marginTop: 4 }}><b>المرجع المعياري:</b> <code>https://github.com/AI-ASAAS/skills</code></div>
              {architecture?.prompts && (
                <div style={{ marginTop: 4 }}>
                  <b>إصدارات البرومبت:</b>{' '}
                  {Object.entries(architecture.prompts).map(([k, v]) => (
                    <code key={k} style={{ marginInlineEnd: 8 }}>{v}</code>
                  ))}
                </div>
              )}
            </div>

            {architecture?.skills_applied && (
              <div>
                <h4 style={{ fontFamily: 'var(--font-display)', margin: '0 0 8px', fontSize: 15 }}>
                  المهارات المطبّقة من AI-ASAAS/skills:
                </h4>
                <div className="wf-subnodes">
                  {architecture.skills_applied.map((skill, idx) => (
                    <div key={idx} className="wf-subnode">{skill}</div>
                  ))}
                </div>
              </div>
            )}

            <h4 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 16 }}>
              مسار تنفيذ الوكيل البرمجي (5 مراحل معيارية):
            </h4>

            <div className="wf-pipeline">
              {(architecture?.pipeline || [
                { step: 1, name: 'Request Validation & Guardrails', component: 'router.py + schemas.py', skill_ref: 'backend/SKILL.md', description: 'التحقق عبر Pydantic وتطبيق حد المعدل وتهيئة الحالة.' },
                { step: 2, name: 'Narrow Read-Only Tools', component: 'tools.py + repository.py', skill_ref: 'ai/build-ai-agents/SKILL.md', description: 'تشغيل أدوات الهوية والمنصة واللهجة وذاكرة SQLite.' },
                { step: 3, name: 'Orchestrator Agent & SSE', component: 'service.py + modules/llm/client.py', skill_ref: 'ai/references/llm-integration.md', description: 'توليد السكريبتات عبر بوابة httpx موحدة مع بث مباشر.' },
                { step: 4, name: 'Deterministic Sanitizer & Reflexion', component: 'tools.py + llm.structured()', skill_ref: 'ai/SKILL.md', description: 'تنظيف برمجي حتمي + تقييم هيكلي بحد أقصى جولتين.' },
                { step: 5, name: 'SQLite Persistence', component: 'database.py + migrations/runner.py', skill_ref: 'backend/references/database-and-migrations.md', description: 'حفظ النتائج والتتبع في قاعدة البيانات المحلية.' },
              ]).map((node) => (
                <div key={node.step} className={`wf-node ${node.step === 3 ? 'wf-node--highlight' : ''}`}>
                  <div className="wf-node__num">{node.step}</div>
                  <div className="wf-node__info">
                    <div className="wf-node__header">
                      <span className="wf-node__name">{node.name}</span>
                      <span className="wf-node__type">{node.skill_ref}</span>
                    </div>
                    <div className="wf-node__desc">{node.description}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>
                      <code>{node.component}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ───────── ASAAS Floating Assistant Widget (skills/ai/SKILL.md) ───────── */}
      <AssistantWidget
        title="مساعد أساس"
        subtitle="استشارة فورية للأفكار والهوكات"
        user={{ id: 'studio-user', displayName: 'صانع المحتوى' }}
        intro="أهلاً بك في استوديو أساس. اسألني عن أفكار حملات، هوكات افتتاحية، أو كيفية ضبط الوكيل."
        suggestions={[
          'اقترح 3 هوكات خاطفة لفيديو 30 ثانية عن وكلاء الذكاء الاصطناعي',
          'ما الفرق بين نبرة LinkedIn ونبرة TikTok في هوية أساس؟',
          'كيف يعمل الناقد الانعكاسي في هذا الوكيل؟',
        ]}
        ask={async (messages) => {
          const latest = messages[messages.length - 1]?.content || '';
          const history = messages.slice(0, -1);
          const res = await chatWithAgentAssistant({
            message: latest,
            history,
            baseUrl,
            apiKey,
            model: selectedModel.trim(),
          });
          return { reply: res.reply };
        }}
      />
    </div>
  );
}
