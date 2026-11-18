@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ======================================================================
echo   منظومة توليد المحتوى الذكي - الوكيل البرمجي (ASAAS Vibe-Coded Agent)
echo ======================================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [!] خطأ: Python غير مثبت على هذا الجهاز!
    echo     يرجى تحميل Python 3.11+ من: https://www.python.org/downloads/
    pause
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo [!] خطأ: Node.js غير مثبت على هذا الجهاز!
    echo     يرجى تحميل Node.js 18+ من: https://nodejs.org/
    pause
    exit /b 1
)

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [*] تم إنشاء ملف .env الافتراضي بنجاح.
    )
)

echo [*] تجهيز وتشغيل الخادم الخلفي للوكيل (FastAPI - Port 8085)...
call start-backend.bat

if not exist "frontend\node_modules" (
    echo [*] تثبيت حزم الواجهة الأمامية (Frontend)...
    cd frontend
    call npm install
    cd ..
)

echo [*] بدء تشغيل الواجهة الأمامية على المنفذ 5180...
start "ASAAS-Frontend-UI" /min cmd /c "cd /d "%~dp0frontend" && npm run dev -- --host 0.0.0.0 --port 5180"

timeout /t 3 /nobreak >nul
echo.
echo ======================================================================
echo [OK] تم تشغيل المنظومة بالكامل بنجاح!
echo  - الواجهة التفاعلية للمستخدم:  http://localhost:5180
echo  - خادم الوكيل البرمجي (API):   http://localhost:8085/docs
echo ======================================================================
echo.
start http://localhost:5180
