@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ======================================================================
echo    إيقاف خدمات الوكيل البرمجي (FastAPI + الواجهة الأمامية)
echo ======================================================================
echo.

echo [*] إيقاف العمليات العاملة على المنفذ 8085 (FastAPI Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8085" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [*] إيقاف العمليات العاملة على المنفذ 5180 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5180" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

docker stop asaas-agent-backend asaas-agent-frontend >nul 2>&1

echo.
echo [OK] تم إيقاف جميع الخدمات بنجاح.
timeout /t 2 /nobreak >nul
