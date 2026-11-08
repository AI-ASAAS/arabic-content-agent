# ASAAS AI Agent & n8n Content Generation Suite
# منظومة أساس لتوليد المحتوى التسويقي الذكي

منظومة ذكاء اصطناعي متكاملة ومستقلة لتوليد المحتوى العربي والسكريبتات التسويقية، تجمع بين واجهة تفاعلية فخمة بهوية أساس (Asaas UI) ومحرك أتمتة متقدم (n8n Agentic Workflow).

---

## ⚡ التشغيل السريع على الأجهزة الشخصية (Local PC)

### نظام ويندوز (Windows):
- شغّل الملف: **`start-all.bat`**
- سيقوم تلقائياً بتثبيت الحزم وتشغيل الخوادم وفتح المتصفح على:
  - **الواجهة التفاعلية:** `http://localhost:5180`
  - **لوحة تحكم n8n:** `http://localhost:5678`
- لاستيراد سير العمل: شغّل **`import-workflows.bat`**.
- للإيقاف: شغّل **`stop-all.bat`**.

---

## 🌐 النشر السحابي على السيرفرات (Linux VPS / Cloud / Docker)

المنظومة مجهزة بالكامل للعمل على أي خادم سحابي (Ubuntu, Debian, AWS, Hetzner, DigitalOcean) عبر أمر واحد:

```bash
git clone https://github.com/AI-ASAAS/arabic-content-agent.git
cd arabic-content-agent
chmod +x deploy.sh && ./deploy.sh
```

أو عبر Docker Compose مباشرة:
```bash
docker compose up --build -d
./import-workflows.sh
```

للاطلاع على دليل إعداد السيرفرات وشهادات SSL و Nginx بالتفصيل، راجع:
📖 **[دليل النشر على السيرفرات (دليل_النشر_على_السيرفرات.md)](./دليل_النشر_على_السيرفرات.md)**.
