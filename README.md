# ASAAS Arabic Content Agent — Vibe-Coded AI Suite
# منظومة أساس لتوليد المحتوى التسويقي العربي (وكيل برمجي مستقل بدون n8n)

منظومة ذكاء اصطناعي متكاملة مبنية بالكامل بأسلوب **Vibe Coding** ووفق معايير ومهارات **[AI-ASAAS/skills](https://github.com/AI-ASAAS/skills)**، تستبدل n8n بالكامل بوكيل برمجي نظيف وسريع مبني بـ **Python FastAPI + Pydantic + SQLite** مع واجهة تفاعلية فخمة بهوية **Asaas UI**.

---

## ✨ الالتزام الكامل بمهارات AI-ASAAS/skills

- **`ai/SKILL.md` & `ai/references/llm-integration.md`**: بوابة موحدة واحدة للنماذج (`backend/modules/llm/client.py`) عبر `httpx.AsyncClient` بدون احتكار SDK، مع منع جمع البيانات (`data_collection: deny`)، وإعادة المحاولة المقيدة، وبرومبتات مرقّمة في ملفات مستقلة (`prompts/*.md`).
- **`ai/build-ai-agents/SKILL.md`**: وكيل منسق (`Orchestrator`) + أدوات قراءة ضيقة ومحققة (`tools.py`) + ناقد انعكاسي (`Reflexion Evaluator`) بمخرجات Pydantic مهيكلة + سياج أمان (سقف أقصى جولتان وحد معدل طلبات).
- **`backend/SKILL.md`**: هيكلية FastAPI المعيارية (`router.py`, `schemas.py`, `service.py`, `repository.py`) مع قاعدة بيانات SQLite (`aiosqlite` + WAL + ترحيلات منظمة في `migrations/`) وأخطاء موحدة بصيغة `{"message": "..."}`.
- **`frontend/SKILL.md` & `frontend/asaas-ui`**: واجهة React + TypeScript عربية RTL بخط ثمانية (Thmanyah)، ومكون المساعد الذكي `AssistantWidget`، وخلو تام من أي أسرار في المتصفح.
- **`ai/references/evaluation.md`**: جناح تقييم آلي جاهز في `evals/run_eval.py` و `evals/content_agent/cases.jsonl`.

---

## ⚡ التشغيل السريع على الأجهزة الشخصية (Windows)

### المتطلبات:
- [Python 3.11+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org)

### التشغيل بنقرة واحدة:
- اضغط على **`start-all.bat`** (سيقوم تلقائياً بإنشاء البيئة الافتراضية وتثبيت الحزم وتشغيل الخادمين وفتح المتصفح):
  - **الواجهة التفاعلية:** `http://localhost:5180`
  - **توثيق FastAPI (Swagger):** `http://localhost:8085/docs`
- للإيقاف: اضغط على **`stop-all.bat`**.

---

## 🌐 النشر السحابي على أي سيرفر (Linux VPS / Cloud / Docker)

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

## 🧪 تشغيل اختبارات التقييم (Evaluation Suite)

```bash
python evals/run_eval.py content_agent
```

للمزيد من التفاصيل راجع:
- 📖 [دليل التشغيل (`دليل_التشغيل.md`)](./دليل_التشغيل.md)
- 🌐 [دليل النشر على السيرفرات (`دليل_النشر_على_السيرفرات.md`)](./دليل_النشر_على_السيرفرات.md)
