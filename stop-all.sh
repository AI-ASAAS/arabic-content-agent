#!/usr/bin/env bash
# ======================================================================
# إيقاف خادم الوكيل البرمجي (FastAPI) والواجهة الأمامية على أنظمة Linux
# ======================================================================

echo "[*] Stopping FastAPI Backend on port 8085..."
fuser -k 8085/tcp 2>/dev/null || true

echo "[*] Stopping Frontend on port 5180..."
fuser -k 5180/tcp 2>/dev/null || true

if command -v docker >/dev/null 2>&1; then
    docker stop asaas-agent-backend asaas-agent-frontend 2>/dev/null || true
fi

echo "[✓] All services stopped successfully."
