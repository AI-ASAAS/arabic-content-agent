#!/usr/bin/env bash
# ======================================================================
# استيراد سير العمل (Workflows) إلى n8n على بيئات Linux
# ======================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if command -v docker >/dev/null 2>&1 && docker ps | grep -q "asaas-n8n-server"; then
    echo "[*] Importing workflows into running n8n Docker container..."
    docker cp agentic_workflow.json asaas-n8n-server:/home/node/agentic_workflow.json
    docker cp baseline_workflow.json asaas-n8n-server:/home/node/baseline_workflow.json
    docker exec -u node asaas-n8n-server n8n import:workflow --input=/home/node/agentic_workflow.json
    docker exec -u node asaas-n8n-server n8n import:workflow --input=/home/node/baseline_workflow.json
    echo "[✓] Workflows imported successfully into n8n Docker!"
elif [ -f "node_modules/n8n/bin/n8n" ]; then
    echo "[*] Importing workflows via local n8n CLI..."
    ./node_modules/n8n/bin/n8n import:workflow --input=agentic_workflow.json
    ./node_modules/n8n/bin/n8n import:workflow --input=baseline_workflow.json
    echo "[✓] Workflows imported successfully!"
else
    echo "[X] Error: Neither running n8n Docker container nor local n8n installation found."
    echo "Please start the services first using ./deploy.sh or ./start-all.sh"
    exit 1
fi
