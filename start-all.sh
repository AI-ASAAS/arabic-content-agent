#!/usr/bin/env bash
# ======================================================================
# تشغيل خادم n8n والواجهة الأمامية في الخلفية على بيئات Linux / Unix
# ======================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export N8N_PORT="${N8N_PORT:-5678}"
export GENERIC_TIMEZONE="Asia/Riyadh"
export TZ="Asia/Riyadh"
export EXECUTIONS_DATA_PRUNE="true"
export EXECUTIONS_DATA_MAX_AGE="168"
export EXECUTIONS_DATA_PRUNE_MAX_COUNT="50000"
export NODE_FUNCTION_ALLOW_BUILTIN="*"
export NODE_FUNCTION_ALLOW_EXTERNAL="*"
export N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS="true"

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
fi

if [ ! -d "node_modules/n8n" ]; then
    echo "[*] Installing n8n dependencies..."
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "[*] Installing frontend dependencies..."
    cd frontend && npm install && cd "$SCRIPT_DIR"
fi

# Start n8n
if lsof -Pi :5678 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[i] n8n is already running on port 5678."
else
    echo "[*] Starting n8n server on port 5678..."
    nohup ./node_modules/n8n/bin/n8n start > n8n.log 2>&1 &
    echo "[✓] n8n started in background (PID: $!). Log: n8n.log"
fi

# Start Frontend
if lsof -Pi :5180 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[i] Frontend is already running on port 5180."
else
    echo "[*] Starting Frontend on port 5180..."
    cd frontend
    nohup npm run dev -- --host 0.0.0.0 --port 5180 > ../frontend.log 2>&1 &
    echo "[✓] Frontend started in background (PID: $!). Log: frontend.log"
    cd "$SCRIPT_DIR"
fi

echo ""
echo "======================================================================"
echo "[✓] All services started successfully!"
echo " - Frontend: http://localhost:5180"
echo " - n8n:      http://localhost:5678"
echo "======================================================================"
