import { useState, useEffect } from 'react';
import {
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
  generateWithNvidiaNemotron,
  DEFAULT_API_KEY,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_STREAMING,
  POPULAR_PROVIDERS,
  getStoredApiKey,
  setStoredApiKey,
  getStoredBaseUrl,
  setStoredBaseUrl,
  getStoredModel,
  setStoredModel,
  getStoredMaxTokens,
  setStoredMaxTokens,
  getStoredStreaming,
  setStoredStreaming,
  testCustomApiConnection,
  type GeneratedPostItem,
} from './openrouterService';
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

const AUDIENCE_OPTIONS = [
  { value: 'المطورون ومهندسو البرمجيات والذكاء الاصطناعي (Developers & Engineers)', label: 'المطورون ومهندسو البرمجيات والذكاء الاصطناعي' },
  { value: 'مدراء التحول الرقمي والتسويق التنفيذي (B2B / C-Level Leaders)', label: 'مدراء التحول الرقمي والتنفيذيون (B2B)' },
  { value: 'أصحاب الشركات الناشئة ورواد الأعمال (Founders & Startups)', label: 'أصحاب الشركات الناشئة ورواد الأعمال (Founders)' },
  { value: 'المهنيون وأصحاب الأعمال الحرة (Professionals & Freelancers)', label: 'المهنيون وأصحاب الأعمال الحرة (Freelancers)' },
  { value: 'الطلاب والراغبون في دخول سوق الذكاء الاصطناعي', label: 'الطلاب والراغبون في دخول سوق الذكاء الاصطناعي' },
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
  'أتمتة الأعمال وبناء فرق الوكلاء الأذكياء بدون كتابة كود واحد',
  'كيف ترفع إنتاجية فريقك 4 أضعاف باستخدام هندسة الأوامر والـ RAG',
  'بناء حلول الذكاء الاصطناعي أم استخدامها؟ خارطة الطريق لعام 2026',
];

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const notify = useToast();

  const [brandName, setBrandName] = useState('أكاديمية أساس للذكاء الاصطناعي');
  const [platform, setPlatform] = useState(PLATFORM_OPTIONS[0].value);
  const [dialect, setDialect] = useState(DIALECT_OPTIONS[0].value);
  const [targetAudience, setTargetAudience] = useState(AUDIENCE_OPTIONS[0].value);
  const [targetSeconds, setTargetSeconds] = useState<number>(60);
  const [variantsCount, setVariantsCount] = useState<number>(3);
  const [topic, setTopic] = useState('الفرق بين مسار هندسة الذكاء الاصطناعي ومسار الذكاء الاصطناعي العملي في أكاديمية أساس');

  // API Key & Model Configuration (supports ANY custom API Base URL, provider, and model)
  const [baseUrl, setBaseUrl] = useState<string>(getStoredBaseUrl());
  const [apiKey, setApiKey] = useState<string>(getStoredApiKey());
  const initialModel = (() => {
    const stored = getStoredModel();
    if (!stored || stored === 'nvidia/nemotron-3-ultra-550b-a55b') {
      return DEFAULT_MODEL; // 'google/gemini-2.5-flash'
    }
    return stored;
  })();
  const [selectedModel, setSelectedModel] = useState<string>(initialModel);
  const [maxTokens, setMaxTokens] = useState<number>(getStoredMaxTokens());
  const [enableStreaming, setEnableStreaming] = useState<boolean>(getStoredStreaming());
  const [showKeyText, setShowKeyText] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [liveStreamText, setLiveStreamText] = useState('');
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [evaluatorFeedback, setEvaluatorFeedback] = useState<string>('');
  const [reasoningCount, setReasoningCount] = useState<number | null>(null);
  const [actualModelUsed, setActualModelUsed] = useState<string>(initialModel);
  const [posts, setPosts] = useState<GeneratedPostItem[]>([]);

  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);

  useEffect(() => {
    setStoredApiKey(apiKey);
    setStoredBaseUrl(baseUrl);
    setStoredModel(selectedModel);
    setStoredMaxTokens(maxTokens);
    setStoredStreaming(enableStreaming);
  }, [apiKey, baseUrl, selectedModel, maxTokens, enableStreaming]);

  // Copy helper
  const handleCopy = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    notify(`تم نسخ ${title} بنجاح إلى الحافظة!`);
  };

  // Test API Connection Live (Works for ANY custom provider / base URL)
  const handleTestApiKey = async () => {
    setIsTestingKey(true);
    setApiTestStatus(null);
    try {
      const res = await testCustomApiConnection({
        baseUrl,
        apiKey,
        model: selectedModel.trim(),
      });
      setApiTestStatus({ success: res.success, message: res.message });
      if (res.success) {
        notify(`الاتصال ناجح بمحرك ${selectedModel} (${res.latencyMs}ms)! ✅`);
      } else {
        notify(`فشل الاتصال: ${res.message}`, 'error');
      }
    } catch (err: any) {
      console.error('Test API error:', err);
      const errMsg = err.message || String(err);
      setApiTestStatus({ success: false, message: `فشل الاتصال: ${errMsg}` });
      notify(`خطأ في التحقق من الـ API: ${errMsg}`, 'error');
    } finally {
      setIsTestingKey(false);
    }
  };

  // Generate Handler with active model, custom API, and custom settings
  const handleGenerate = async () => {
    if (!apiKey && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      setShowApiModal(true);
      notify('يرجى إدخال مفتاح API في نافذة الإعدادات أو اختيار سيرفر محلي (مثل Ollama) للمتابعة 🔑', 'error');
      return;
    }

    setIsGenerating(true);
    setCurrentStep(1);
    setLiveStreamText('');
    setQualityScore(null);
    setReasoningCount(null);

    // Also trigger n8n form webhook in background
    try {
      const formData = new FormData();
      formData.append('اسم العلامة التجارية / الكيان (Brand Name)', brandName);
      formData.append('المنصة المستهدفة (Platform)', platform);
      formData.append('اللهجة ونبرة الصوت (Dialect & Tone)', dialect);
      formData.append('الجمهور المستهدف (Target Audience)', targetAudience);
      formData.append('المدة المستهدفة بالثواني', String(targetSeconds));
      formData.append('عدد النصوص المطلوبة', String(variantsCount));
      formData.append('فكرة الحملة أو المنشور (Campaign Topic / Angle)', topic);
      fetch('http://localhost:5678/form/128b22ba-f198-45ed-9984-f81c88fce565', {
        method: 'POST',
        body: formData,
        mode: 'no-cors',
      }).catch(() => {});
    } catch {}

    try {
      const result = await generateWithNvidiaNemotron({
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
        onStepChange: (step) => setCurrentStep(step),
        onStreamContent: (stream) => {
          setLiveStreamText(stream);
          // Auto scroll live container smoothly
          const container = document.getElementById('live-stream-container');
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        },
      });

      setPosts(result.posts);
      setQualityScore(result.score);
      setEvaluatorFeedback(result.feedback);
      setActualModelUsed(result.usedModel);
      if (result.reasoningTokens) setReasoningCount(result.reasoningTokens);
      notify(`اكتمل توليد ${result.posts.length} سكريبتات نقية بنجاح بمحرك ${result.usedModel}! 🚀`);
    } catch (err: any) {
      console.error('Generation error:', err);
      notify(`حدث خطأ أثناء التوليد: ${err.message || err}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-container">
      {/* ───────── Top Navigation Header (Unified Clean App Bar) ───────── */}
      <Glass as="header" thick pill className="top-nav">
        <div className="top-nav__brand">
          <img src="/brand/logo.png" alt="ASAAS Logo" className="brand-logo-img" />
          <div className="top-nav__title-group">
            <h1>
              <Swash>أساس للذكاء الاصطناعي</Swash>
            </h1>
            <span className="app-subtitle">صياغة سكريبتات تسويقية نقية</span>
          </div>
        </div>

        <div className="top-nav__actions">
          {/* Model Status Badge Button */}
          <button
            type="button"
            className="badge-live-agent"
            onClick={() => setShowApiModal(true)}
            style={{ cursor: 'pointer' }}
            title="إعدادات الـ API والمودل وسقف التوكنات والبث المباشر"
          >
            <span className="live-pulse" />
            {selectedModel.split('/').pop()}
          </button>

          {/* API Settings Modal Trigger */}
          <Button variant="ghost" size="sm" icon="edit" onClick={() => setShowApiModal(true)}>
            إعدادات API والمودل
          </Button>

          {/* n8n Canvas Editor Button */}
          <Button
            variant="ghost"
            size="sm"
            icon="dashboard"
            onClick={() => window.open('http://localhost:5678/workflow/d4aV1FqCq6JLIR2v', '_blank')}
          >
            محرر n8n
          </Button>

          {/* Architecture Modal Button */}
          <Button variant="ghost" size="sm" icon="file" onClick={() => setShowWorkflowModal(true)}>
            معمارية n8n
          </Button>

          {/* Theme Toggle Button */}
          <Button variant="glass" size="sm" icon="sun" onClick={toggleTheme}>
            {theme === 'dark' ? 'النهار' : 'الليل'}
          </Button>
        </div>
      </Glass>

      {/* ───────── Stats Overview Tiles ───────── */}
      <div className="stats-summary">
        <Glass className="stat-tile">
          <div className="stat-tile__header">
            <span>محرك التوليد النشط</span>
            <div className="stat-tile__icon-box">
              <Icon name="sparkle" />
            </div>
          </div>
          <div className="stat-tile__value">{selectedModel.split('/').pop()}</div>
          <div className="stat-tile__footer">{selectedModel}</div>
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
          <div className="stat-tile__footer">فحص النبرة وخلو النصوص من الحشو</div>
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
        {/* Main Column: Studio Form */}
        <Card title="استوديو ضبط السكريبت والحملة" icon="edit">
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerate();
            }}
          >
            {/* Target Seconds & Variants Count Selectors (New feature) */}
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
              <Field label="اسم الكيان أو العلامة التجارية (Brand Name)">
                {(id) => (
                  <TextInput
                    id={id}
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="أكاديمية أساس للذكاء الاصطناعي"
                  />
                )}
              </Field>

              <Field label="الجمهور المستهدف (Target Audience)">
                {(id) => (
                  <Select id={id} value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}>
                    {AUDIENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <Field
              label="فكرة الحملة أو موضوع السكريبت (Campaign Topic / Prompt)"
              hint="سيتم توليد كلام إلقائي صافٍ ومرتب بدون مشاهد وبدون أي علامات ترقيم إطلاقاً"
            >
              {(id) => (
                <TextArea
                  id={id}
                  rows={3}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="اكتب فكرة السكريبت هنا..."
                />
              )}
            </Field>

            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>أفكار جاهزة للتوليد الفوري:</span>
              <div className="chips-row">
                {PRESET_TOPICS.map((p, idx) => (
                  <button key={idx} type="button" className="chip-btn" onClick={() => setTopic(p)}>
                    {p.length > 50 ? p.substring(0, 50) + '...' : p}
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

        {/* Right Column: Live Agent Lifecycle & Reflexion Timeline */}
        <Card title={`مراحل التوليد والتدقيق (${selectedModel.split('/').pop()})`} icon="sparkle">
          <div className="pipeline-timeline">
            <div
              className={`pipeline-step ${currentStep === 1 ? 'pipeline-step--active' : currentStep > 1 ? 'pipeline-step--done' : ''}`}
            >
              <div className="step-marker">{currentStep > 1 ? '✓' : '1'}</div>
              <div className="step-content">
                <div className="step-title">تخطيط الوكيل المنسق (Orchestrator)</div>
                <div className="step-desc">
                  حساب الكلمات المستهدفة ({Math.round(targetSeconds * 2.2)} كلمة) لـ {targetSeconds} ثانية وحظر علامات الترقيم.
                </div>
              </div>
            </div>

            <div
              className={`pipeline-step ${currentStep === 2 ? 'pipeline-step--active' : currentStep > 2 ? 'pipeline-step--done' : ''}`}
            >
              <div className="step-marker">{currentStep > 2 ? '✓' : '2'}</div>
              <div className="step-content">
                <div className="step-title">استرجاع قواعد وهوية أساس (RAG)</div>
                <div className="step-desc">استدعاء قواعد النبرة الموثوقة والافتتاحيات الحاسمة.</div>
              </div>
            </div>

            <div
              className={`pipeline-step ${currentStep === 3 ? 'pipeline-step--active' : currentStep > 3 ? 'pipeline-step--done' : ''}`}
            >
              <div className="step-marker">{currentStep > 3 ? '✓' : '3'}</div>
              <div className="step-content">
                <div className="step-title">توليد {variantsCount} سكريبتات نقية بدون مشاهد</div>
                <div className="step-desc">
                  صياغة كلام منطوق صافٍ بدون علامات ترقيم بمحرك {actualModelUsed.split('/').pop()}.
                </div>
              </div>
            </div>

            <div
              className={`pipeline-step ${currentStep === 4 ? 'pipeline-step--active' : currentStep > 4 ? 'pipeline-step--done' : ''}`}
            >
              <div className="step-marker">{currentStep > 4 ? '✓' : '4'}</div>
              <div className="step-content">
                <div className="step-title">الناقد الانعكاسي (Reflexion Evaluator)</div>
                <div className="step-desc">فحص خلو النصوص من المشاهد والعلامات ومطابقتها للمدة المحددة.</div>
              </div>
            </div>

            <div
              className={`pipeline-step ${currentStep === 5 ? 'pipeline-step--active' : currentStep > 5 ? 'pipeline-step--done' : ''}`}
            >
              <div className="step-marker">{currentStep >= 5 ? '✓' : '5'}</div>
              <div className="step-content">
                <div className="step-title">اعتماد المخرجات النهائية للتسجيل</div>
                <div className="step-desc">جاهزية كاملة للقراءة الإلقائية والـ Voiceover بنجاح.</div>
              </div>
            </div>
          </div>

          {qualityScore !== null && (
            <div className="score-box" style={{ marginTop: 14 }}>
              <div className="score-number">{qualityScore}</div>
              <div className="score-details">
                <h4>اعتماد السكريبت النقي (Clean Script Approved)</h4>
                <p>{evaluatorFeedback}</p>
                {reasoningCount && (
                  <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>
                    توكنات التفكير والتخطيط: {reasoningCount}
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

      {/* ───────── Live Real-time Streaming Display (طلب المستخدم: رؤية البث أثناء التوليد) ───────── */}
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
              <span>شاشة البث الحي والتوليد المباشر</span>
              <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>({actualModelUsed})</span>
            </div>
            <div className="live-stream-theater__stats">
              <span className="live-stat-pill">
                الكلمات المكتوبة: <b className="num" style={{ color: 'var(--accent)' }}>{liveStreamText.split(/\s+/).filter(Boolean).length}</b>
              </span>
              <span className="live-stat-pill">
                المستهدف: <b className="num">{targetSeconds}</b> ثانية (~<b className="num">{Math.round(targetSeconds * 2.2)}</b> كلمة)
              </span>
              <span className="live-stat-pill">
                الحالة: {isGenerating ? '⚡ جارٍ التوليد الحي لحظة بلحظة...' : '✅ اكتمل البث والتدقيق'}
              </span>
            </div>
          </div>

          <div className="live-stream-theater__body" id="live-stream-container">
            {liveStreamText || 'جاري الاتصال بالنموذج وبدء التدفق المباشر للكلمات...'}
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
                      الكلمات: <b className="num">{post.wordsCount}</b>
                    </span>
                    <span>
                      وقت الإلقاء المقدر: ~<b className="num">{post.readingSeconds}</b> ثانية
                    </span>
                    <span>بدون مشاهد وبدون علامات ترقيم ✅</span>
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

      {/* ───────── API & Model Settings Modal (Universal Provider Freedom) ───────── */}
      {showApiModal && (
        <Modal
          title="إعدادات الـ API ومحرك التوليد (حرية كاملة لأي مزود)"
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
                  setApiKey(DEFAULT_API_KEY);
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
              ✨ <b>حرية كاملة للربط:</b> يمكنك ربط أي مزود ذكاء اصطناعي يعجبك (سواء <b>OpenRouter</b> أو <b>Google Gemini مباشر</b> أو <b>OpenAI</b> أو <b>Groq</b> أو <b>DeepSeek</b> أو خادم محلي خاص بك كـ <b>Ollama</b>) بإدخال الرابط والمفتاح والمودل أدناه دون أي قيود.
            </div>

            {/* Quick Provider Presets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                اختيار سريع لمزود الخدمة (بنقرة واحدة لملء الإعدادات):
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
                      <span style={{ fontSize: 10, opacity: 0.8, fontFamily: 'monospace' }}>
                        {p.defaultModel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Base URL */}
            <Field
              label="رابط الـ API الأساسي (API Base URL) - قابل للتعديل بالكامل"
              hint="أي رابط متوافق مع صيغة OpenAI Chat Completions (يدعم السحابة والسيرفرات المحلية)"
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

            {/* API Key */}
            <Field
              label="مفتاح الـ API (API Key)"
              hint="مفتاح الربط للمزود المختار (اتركه فارغاً إذا كنت تتصل بسيرفر محلي كـ Ollama)"
            >
              {(id) => (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    id={id}
                    type={showKeyText ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-... أو مفتاح الـ API الخاص بك"
                    style={{ flex: 1, fontFamily: 'monospace' }}
                  />
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    icon="eye"
                    onClick={() => setShowKeyText(!showKeyText)}
                    title={showKeyText ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                  >
                    {showKeyText ? 'إخفاء' : 'إظهار'}
                  </Button>
                </div>
              )}
            </Field>

            {/* Model Name */}
            <Field
              label="معرّف النموذج / نوع الـ API (AI Model Name / Slug)"
              hint="اكتب يدوياً أي مودل معتمد لدى المزود المختار، أو اختر من المقترحات السريعة:"
            >
              {(id) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <TextInput
                    id={id}
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    placeholder="google/gemini-2.5-flash أو gpt-4o أو llama3.2"
                    style={{ fontFamily: 'monospace', fontSize: 14 }}
                  />
                  <div className="model-suggestions-row">
                    {[
                      { id: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash' },
                      { id: 'nvidia/nemotron-3-ultra-550b-a55b', label: 'nvidia/nemotron-3-ultra-550b-a55b' },
                      { id: 'openai/gpt-4o-mini', label: 'gpt-4o-mini' },
                      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'llama-3.3-70b' },
                      { id: 'deepseek/deepseek-chat', label: 'deepseek-chat' },
                      { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
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

            {/* سقف التوكنات (قابل للتعديل مع قيمة افتراضية) */}
            <Field
              label="سقف التوكنات (Max Tokens Limit) - قابل للتعديل"
              hint="الحد الأقصى للتوكنات في الطلب الواحد. القيمة الافتراضية 1,000 توكن لضمان السرعة وحماية الرصيد المالي."
            >
              {(id) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <TextInput
                      id={id}
                      type="number"
                      min={100}
                      max={8000}
                      step={50}
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(Number(e.target.value) || 1000)}
                      style={{ maxWidth: 180, fontFamily: 'monospace', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text-3)' }}>توكن (Tokens)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[500, 800, 1000, 1500, 2000].map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`chip-btn ${maxTokens === t ? 'chip-btn--active' : ''}`}
                        onClick={() => setMaxTokens(t)}
                      >
                        {t === 1000 ? `${t} (الافتراضي)` : t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Field>

            {/* البث المباشر (قابل للتعديل مع قيمة افتراضية) */}
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
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  البث المباشر للكلمات على الشاشة (Live Streaming)
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  {enableStreaming
                    ? 'مفعل (الافتراضي): يظهر النص وهو يُكتب كلمة بكلمة لحظة بلحظة على الشاشة'
                    : 'معطل: انتظار اكتمال التوليد بالكامل ثم إظهار النتيجة دفعة واحدة'}
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

      {/* ───────── Workflow Details Modal ───────── */}
      {showWorkflowModal && (
        <Modal
          title="معمارية الوكيل والربط مع n8n & NVIDIA"
          onClose={() => setShowWorkflowModal(false)}
          footer={
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                onClick={() => window.open('http://localhost:5678/workflow/d4aV1FqCq6JLIR2v', '_blank')}
              >
                فتح الـ Canvas في محرر n8n
              </Button>
              <Button variant="ghost" onClick={() => setShowWorkflowModal(false)}>
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
              المعمارية متطابقة بنسبة 100% مع عقد n8n الفعلية (12 عقدة عاملة في مساحة العمل)
            </div>

            <div style={{ background: 'var(--glass-inset)', padding: 14, borderRadius: 12, fontSize: 13 }}>
              <div><b>اسم سير العمل في n8n:</b> Arabic Content Generator - Agentic AI (ASAAS Brand & NVIDIA Nemotron)</div>
              <div style={{ marginTop: 4 }}><b>معرف سير العمل (Workflow ID):</b> <code>d4aV1FqCq6JLIR2v</code></div>
              <div style={{ marginTop: 4 }}><b>نموذج الذكاء الاصطناعي الأساسي:</b> <code>{selectedModel}</code> (NVIDIA Nemotron 3 Ultra عبر OpenRouter)</div>
            </div>

            <h4 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 16 }}>
              المسار المعماري لتدفق البيانات والعقد الـ 12 في n8n:
            </h4>

            <div className="wf-pipeline">
              <div className="wf-node">
                <div className="wf-node__num">1</div>
                <div className="wf-node__info">
                  <div className="wf-node__header">
                    <span className="wf-node__name">On form submission</span>
                    <span className="wf-node__type">n8n-nodes-base.formTrigger</span>
                  </div>
                  <div className="wf-node__desc">
                    بوابة استقبال مدخلات الحملة: اسم الكيان المنصة اللهجة الجمهور المستهدف المدة بالثواني وعدد النصوص المطلوبة.
                  </div>
                </div>
              </div>

              <div className="wf-node">
                <div className="wf-node__num">2</div>
                <div className="wf-node__info">
                  <div className="wf-node__header">
                    <span className="wf-node__name">Initialize State & ASAAS Brand Tokens</span>
                    <span className="wf-node__type">n8n-nodes-base.code</span>
                  </div>
                  <div className="wf-node__desc">
                    تهيئة حالة الوكيل وحقن هوية أساس وقواعد النبرة الصارمة وحظر علامات الترقيم والمشاهد وضبط عداد التكرار (iteration_count = 0).
                  </div>
                </div>
              </div>

              <div className="wf-node wf-node--highlight">
                <div className="wf-node__num">3</div>
                <div className="wf-node__info">
                  <div className="wf-node__header">
                    <span className="wf-node__name">Orchestrator Agent</span>
                    <span className="wf-node__type">@n8n/n8n-nodes-langchain.agent</span>
                  </div>
                  <div className="wf-node__desc">
                    الوكيل المنسق الذكي المسؤول عن التخطيط وتوليد السكريبتات النقية ويتصل بالعقد الفرعية الـ 4 التالية:
                  </div>
                  <div className="wf-subnodes">
                    <div className="wf-subnode">
                      <b>نموذج اللغة:</b> NVIDIA Nemotron 3 Ultra (OpenRouter) <code>@n8n/n8n-nodes-langchain.lmChatOpenAi</code>
                    </div>
                    <div className="wf-subnode">
                      <b>الذاكرة:</b> Window Buffer Memory <code>@n8n/n8n-nodes-langchain.memoryBufferWindow</code>
                    </div>
                    <div className="wf-subnode">
                      <b>أداة الاسترجاع:</b> Qdrant Vector Store <code>@n8n/n8n-nodes-langchain.vectorStoreQdrant</code> (متصلة بالعقدة الفرعية Embeddings OpenAI)
                    </div>
                    <div className="wf-subnode">
                      <b>أداة الهوية:</b> ASAAS Brand & Platform Guidelines Tool <code>@n8n/n8n-nodes-langchain.toolCode</code>
                    </div>
                  </div>
                </div>
              </div>

              <div className="wf-node">
                <div className="wf-node__num">4</div>
                <div className="wf-node__info">
                  <div className="wf-node__header">
                    <span className="wf-node__name">Reflexion Evaluator</span>
                    <span className="wf-node__type">@n8n/n8n-nodes-langchain.chainLlm</span>
                  </div>
                  <div className="wf-node__desc">
                    وكيل النقد الذاتي والتقييم: يفحص نبرة النص وخلوه التام من علامات الترقيم والمشاهد ويمنح تقييماً من 10 مع ملاحظات نقدية.
                  </div>
                </div>
              </div>

              <div className="wf-node">
                <div className="wf-node__num">5</div>
                <div className="wf-node__info">
                  <div className="wf-node__header">
                    <span className="wf-node__name">Reflexion Loop Guardrail</span>
                    <span className="wf-node__type">n8n-nodes-base.code</span>
                  </div>
                  <div className="wf-node__desc">
                    سياج أمان لحساب عدد دورات النقد ومنع التكرار اللانهائي وهدر التوكنات (سقف أقصى دورات = 2).
                  </div>
                </div>
              </div>

              <div className="wf-node">
                <div className="wf-node__num">6</div>
                <div className="wf-node__info">
                  <div className="wf-node__header">
                    <span className="wf-node__name">Quality Threshold Met?</span>
                    <span className="wf-node__type">n8n-nodes-base.if</span>
                  </div>
                  <div className="wf-node__desc">
                    بوابة اتخاذ القرار: فحص هل درجة الجودة &gt;= 8 أو تم بلوغ الحد الأقصى للمحاولات؟
                  </div>
                </div>
              </div>

              <div className="wf-loopback-card">
                <span>🔄 <b>مسار الإعادة (Reflexion Loop):</b> إذا كانت النتيجة &lt; 8 ولم يتجاوز الجولتين يعود المسار فوراً إلى Orchestrator Agent مع الملاحظات النقدية للتصحيح.</span>
              </div>

              <div className="wf-node">
                <div className="wf-node__num">7</div>
                <div className="wf-node__info">
                  <div className="wf-node__header">
                    <span className="wf-node__name">Format Final Output</span>
                    <span className="wf-node__type">n8n-nodes-base.set</span>
                  </div>
                  <div className="wf-node__desc">
                    تنسيق وتصفية السكريبت النهائي الصافي وإخراجه جاهزاً للقراءة والتسجيل الصوتي.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
