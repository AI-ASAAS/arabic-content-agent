#!/usr/bin/env bash
# ======================================================================
# سكريبت النشر السحابي الآلي لمنظومة الوكيل البرمجي (ASAAS Vibe-Coded Agent)
# يدعم Docker Compose (الموصى به) أو التشغيل المباشر عبر Python FastAPI + PM2
# ======================================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${CYAN}======================================================================${NC}"
echo -e "${CYAN}   🚀 النشر السحابي للوكيل البرمجي (ASAAS Vibe-Coded FastAPI Agent)${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo ""

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo -e "${YELLOW}[*] إنشاء ملف .env افتراضي من .env.example...${NC}"
    cp .env.example .env
fi

# 1. النشر عبر Docker Compose إن كان متوفراً
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo -e "${GREEN}[✓] تم اكتشاف Docker & Docker Compose!${NC}"
    echo -e "${CYAN}[*] بناء وتشغيل حاويات الوكيل البرمجي (FastAPI Backend + Nginx Frontend)...${NC}"
    docker compose down 2>/dev/null || true
    docker compose up --build -d

    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo 'localhost')
    echo ""
    echo -e "${GREEN}======================================================================${NC}"
    echo -e "${GREEN}[✓] تم نشر وتشغيل المنظومة بنجاح عبر Docker!${NC}"
    echo -e " - الواجهة التفاعلية (Frontend): http://${SERVER_IP}:5180"
    echo -e " - خادم الوكيل وتوثيق API:       http://${SERVER_IP}:8085/docs"
    echo -e "${GREEN}======================================================================${NC}"
    exit 0
fi

# 2. النشر المباشر عبر Python + Node.js (بدون Docker)
echo -e "${YELLOW}[!] Docker غير متوفر. جاري النشر المباشر عبر Python FastAPI & Node.js...${NC}"

if ! command -v python3 >/dev/null 2>&1; then
    echo -e "${RED}[X] خطأ: python3 غير مثبت على هذا السيرفر!${NC}"
    exit 1
fi

if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}[X] خطأ: Node.js غير مثبت على هذا السيرفر!${NC}"
    exit 1
fi

echo -e "${CYAN}[*] تجهيز بيئة Python وتثبيت متطلبات FastAPI...${NC}"
python3 -m venv backend/.venv
backend/.venv/bin/pip install --upgrade pip
backend/.venv/bin/pip install -r backend/requirements.txt

echo -e "${CYAN}[*] تثبيت وبناء الواجهة الأمامية (Frontend)...${NC}"
cd frontend
npm install
npm run build
cd "$SCRIPT_DIR"

if command -v pm2 >/dev/null 2>&1; then
    echo -e "${CYAN}[*] تشغيل الخدمات عبر PM2...${NC}"
    pm2 startOrRestart ecosystem.config.js
    pm2 save
else
    echo -e "${YELLOW}[!] PM2 غير مثبت. تشغيل الخدمات في الخلفية عبر start-all.sh...${NC}"
    chmod +x start-all.sh stop-all.sh
    ./start-all.sh
fi

SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo 'localhost')
echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}[✓] تم نشر وتشغيل الوكيل البرمجي بنجاح!${NC}"
echo -e " - الواجهة التفاعلية (Frontend): http://${SERVER_IP}:5180"
echo -e " - خادم الوكيل وتوثيق API:       http://${SERVER_IP}:8085/docs"
echo -e "${GREEN}======================================================================${NC}"
