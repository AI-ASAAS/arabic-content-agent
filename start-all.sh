#!/usr/bin/env bash
# ======================================================================
# تشغيل خادم الوكيل البرمجي (FastAPI) والواجهة الأمامية على Linux / macOS
# ======================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
fi

if [ ! -f "backend/.venv/bin/uvicorn" ]; then
    echo "[*] Setting up Python virtual environment & installing FastAPI backend..."
    python3 -m venv backend/.venv
    backend/.venv/bin/pip install -r backend/requirements.txt
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "[*] Installing frontend dependencies..."
    cd frontend && npm install && cd "$SCRIPT_DIR"
fi

if lsof -Pi :8085 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[i] FastAPI Agent Backend is already running on port 8085."
else
    echo "[*] Starting FastAPI Agent Backend on port 8085..."
    cd backend
    nohup .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8085 > ../backend.log 2>&1 &
    echo "[✓] Backend started (PID: $!). Log: backend.log"
    cd "$SCRIPT_DIR"
fi

if lsof -Pi :5180 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[i] Frontend is already running on port 5180."
else
    echo "[*] Starting Frontend UI on port 5180..."
    cd frontend
    nohup npm run dev -- --host 0.0.0.0 --port 5180 > ../frontend.log 2>&1 &
    echo "[✓] Frontend started (PID: $!). Log: frontend.log"
    cd "$SCRIPT_DIR"
fi

echo ""
echo "======================================================================"
echo "[✓] ASAAS Vibe-Coded Agent Suite started!"
echo " - Frontend UI:  http://localhost:5180"
echo " - FastAPI Docs: http://localhost:8085/docs"
echo "======================================================================"
