#!/usr/bin/env bash
# ======================================================================
# إيقاف خادم n8n والواجهة الأمامية على أنظمة Linux
# ======================================================================

echo "[*] Stopping services running on port 5678 (n8n)..."
fuser -k 5678/tcp 2>/dev/null || true

echo "[*] Stopping services running on port 5180 (Frontend)..."
fuser -k 5180/tcp 2>/dev/null || true

if command -v docker >/dev/null 2>&1; then
    docker stop asaas-n8n-server asaas-ai-frontend 2>/dev/null || true
fi

echo "[✓] All services stopped successfully."
