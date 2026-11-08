@echo off
setlocal
cd /d "%~dp0"

echo Starting Frontend UI on port 5180...
npm run dev -- --host 0.0.0.0 --port 5180
