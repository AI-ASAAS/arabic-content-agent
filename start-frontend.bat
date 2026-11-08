@echo off
setlocal
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo [*] Installing frontend dependencies...
    call npm install
)

echo [*] Starting Frontend UI on http://localhost:5180 ...
npm run dev -- --host 0.0.0.0 --port 5180
