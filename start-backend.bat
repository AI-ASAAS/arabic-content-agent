@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0backend"

where python >nul 2>nul
if errorlevel 1 (
    echo [X] Python غير مثبت على هذا الجهاز! يرجى تثبيت Python 3.11+ من https://python.org
    pause
    exit /b 1
)

if not exist ".venv\Scripts\uvicorn.exe" (
    echo [*] إنشاء البيئة الافتراضية وتثبيت حزم FastAPI للوكيل البرمجي...
    python -m venv .venv
    .venv\Scripts\pip install -r requirements.txt
)

netstat -ano | findstr ":8085" | findstr LISTENING >nul
if errorlevel 1 (
    echo [*] تشغيل خادم الوكيل البرمجي (FastAPI) على المنفذ 8085...
    start "ASAAS-Agent-Backend" /min cmd /c "cd /d "%~dp0backend" && .venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8085"
) else (
    echo [i] خادم الوكيل البرمجي يعمل بالفعل على المنفذ 8085.
)
