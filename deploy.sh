#!/usr/bin/env bash
# ======================================================================
# سكريبت النشر الآلي على السيرفرات (Server Deployment Script)
# يدعم خياري النشر: Docker Compose (الموصى به) أو التشغيل المباشر عبر Node.js & PM2
# ======================================================================

set -e

# ألوان الطباعة
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${CYAN}======================================================================${NC}"
echo -e "${CYAN}   🚀 سكريبت النشر السحابي لمنظومة توليد المحتوى الذكي (ASAAS AI)${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo ""

# 1. التحقق من وجود ملف .env
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}[*] إنشاء ملف .env افتراضي من .env.example...${NC}"
        cp .env.example .env
    fi
fi

# 2. التحقق من توافر Docker
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo -e "${GREEN}[✓] تم اكتشاف Docker & Docker Compose بنجاح!${NC}"
    echo -e "${CYAN}[*] جاري بناء وتشغيل حاويات Docker (n8n + Frontend)...${NC}"
    docker compose down 2>/dev/null || true
    docker compose up --build -d
    
    echo ""
    echo -e "${GREEN}======================================================================${NC}"
    echo -e "${GREEN}[✓] تم نشر وتشغيل المنظومة بنجاح عبر Docker!${NC}"
    echo -e " - الواجهة التفاعلية (Frontend): http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost'):5180"
    echo -e " - محرك الأتمتة والـ Workflows (n8n): http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost'):5678"
    echo -e "${GREEN}======================================================================${NC}"
    exit 0
fi

# 3. في حال عدم وجود Docker، النشر المباشر عبر Node.js
echo -e "${YELLOW}[!] Docker غير مثبت. جاري النشر المباشر عبر Node.js...${NC}"

if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}[X] خطأ: Node.js غير مثبت على هذا السيرفر!${NC}"
    echo -e "يرجى تثبيت Node.js (الإصدار 18 أو 20) أو تثبيت Docker ثم إعادة تشغيل هذا السكربت."
    exit 1
fi

echo -e "${CYAN}[*] تثبيت حزم خادم n8n...${NC}"
npm install

echo -e "${CYAN}[*] تثبيت وبناء الواجهة الأمامية (Frontend)...${NC}"
cd frontend
npm install
npm run build
cd "$SCRIPT_DIR"

# التحقق من وجود PM2
if command -v pm2 >/dev/null 2>&1; then
    echo -e "${CYAN}[*] إعادة تشغيل الخدمات عبر PM2...${NC}"
    pm2 startOrRestart ecosystem.config.js
    pm2 save
else
    echo -e "${YELLOW}[!] PM2 غير مثبت. تشغيل الخدمات في الخلفية عبر nohup...${NC}"
    chmod +x start-all.sh stop-all.sh
    ./start-all.sh
fi

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}[✓] تم نشر وتشغيل المنظومة بنجاح!${NC}"
echo -e " - الواجهة التفاعلية (Frontend): http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost'):5180"
echo -e " - محرك الأتمتة (n8n):            http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost'):5678"
echo -e "${GREEN}======================================================================${NC}"
