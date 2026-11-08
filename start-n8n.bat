@echo off
setlocal
cd /d "%~dp0"

set N8N_PORT=5678
set GENERIC_TIMEZONE=Asia/Riyadh
set TZ=Asia/Riyadh
set EXECUTIONS_DATA_PRUNE=true
set EXECUTIONS_DATA_MAX_AGE=168
set EXECUTIONS_DATA_PRUNE_MAX_COUNT=50000
set NODE_FUNCTION_ALLOW_BUILTIN=*
set NODE_FUNCTION_ALLOW_EXTERNAL=*
set N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true

netstat -ano | findstr ":5678" | findstr LISTENING >nul
if errorlevel 1 (
    echo Starting n8n server on port 5678...
    start "n8n-Server" /min node node_modules\n8n\bin\n8n start
    echo n8n server started in background.
) else (
    echo n8n is already running on port 5678.
)
