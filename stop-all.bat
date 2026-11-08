@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ======================================================================
echo    إيقاف كافة خدمات المنظومة (n8n + الواجهة الأمامية)
echo ======================================================================
echo.

echo [*] إيقاف العمليات العاملة على المنفذ 5678 (n8n)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5678" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [*] إيقاف العمليات العاملة على المنفذ 5180 (الواجهة الأمامية)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5180" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

docker stop n8n-public-tunnel >nul 2>&1
docker stop n8n-server >nul 2>&1

echo.
echo [✓] تم إيقاف جميع الخدمات بنجاح.
timeout /t 2 /nobreak >nul
