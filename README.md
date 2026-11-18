# ASAAS Arabic Content Agent
# منظومة أساس لصياغة المحتوى التسويقي العربي

منظومة متكاملة لتوليد المحتوى والسكريبتات التسويقية باللغة العربية باستخدام وكلاء الذكاء الاصطناعي، تجمع بين خادم خلفي معياري مبني بـ **Python FastAPI** وواجهة تفاعلية حديثة بهوية **Asaas UI**.

---

## المزايا الأساسية

- **توليد سكريبتات نقية وجاهزة للإلقاء:** دعم تحديد المدة الزمنية بالثواني، عدد النسخ، المنصة المستهدفة، اللهجة، عنوان الفيديو، والجمهور المستهدف.
- **بث مباشر لحظي (SSE Streaming):** عرض النص ومراحل عمل الوكيل مباشرة أثناء التوليد.
- **مراجعة وتقييم تلقائي للجودة (Reflexion Evaluator):** فحص برمجي وتقييم هيكلي من 10 درجات مع إعادة تحسين تلقائية مقيدة عند الحاجة.
- **مرونة كاملة في مزودات النماذج:** دعم OpenRouter و Google Gemini و OpenAI و Groq و DeepSeek والخوادم المحلية مثل Ollama عبر بوابة `httpx` موحدة.
- **سجل تشغيل محلي (SQLite):** حفظ الجلسات والنتائج والتقييمات لاسترجاعها لاحقاً بسهولة.
- **مساعد تفاعلي مدمج:** نافذة مساعدة ذكية لاقتراح الأفكار والهوكات التسويقية.

---

## البنية والمعايير الهندسية

تم بناء المشروع وفق المعايير المعتمدة في مستودع [AI-ASAAS/skills](https://github.com/AI-ASAAS/skills):

- **الخادم الخلفي (`backend/`):** هيكلية FastAPI معيارية (`router.py`, `schemas.py`, `service.py`, `repository.py`) مع قاعدة بيانات SQLite غير متزامنة (`aiosqlite` + WAL) وترحيلات منظمة في `migrations/`.
- **طبقة النماذج (`backend/modules/llm/`):** عميل OpenAI-compatible موحد عبر `httpx.AsyncClient` مع إعادة المحاولة المقيدة، قائمة نماذج بديلة، وبرومبتات مرقّمة في `prompts/*.md`.
- **الواجهة الأمامية (`frontend/`):** React + TypeScript + Vite بتصميم عربي RTL وخط ثمانية (Thmanyah) ومكونات `asaas-ui`.
- **الاختبارات والتقييم (`evals/`):** مجموعة حالات تقييم مرجعية للتحقق من الأدوات وقواعد الجودة في `evals/content_agent/cases.jsonl`.

---

## التشغيل السريع

### على نظام Windows
**المتطلبات:** [Python 3.11+](https://www.python.org/downloads/) و [Node.js 18+](https://nodejs.org/)

1. شغّل الملف `start-all.bat` لتهيئة البيئة وتشغيل الخادم الخلفي والواجهة تلقائياً:
   - **الواجهة الأمامية:** `http://localhost:5180`
   - **توثيق الـ API (Swagger):** `http://localhost:8085/docs`
2. لإيقاف الخدمات شغّل `stop-all.bat`.

### على السيرفرات (Linux / Docker)
```bash
git clone https://github.com/AI-ASAAS/arabic-content-agent.git
cd arabic-content-agent
chmod +x deploy.sh && ./deploy.sh
```

أو عبر Docker Compose مباشرة:
```bash
docker compose up --build -d
```

---

## تشغيل اختبارات التقييم

```bash
python evals/run_eval.py content_agent
```

---

## التوثيق الإضافي

- [دليل التشغيل (`دليل_التشغيل.md`)](./دليل_التشغيل.md)
- [دليل النشر على السيرفرات (`دليل_النشر_على_السيرفرات.md`)](./دليل_النشر_على_السيرفرات.md)
