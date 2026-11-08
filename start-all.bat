@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ======================================================================
echo    منظومة توليد المحتوى الذكي - أساس (ASAAS AI Agent & n8n)
echo ======================================================================
echo.

:: 1. التحقق من وجود Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [!] خطأ: Node.js غير مثبت على هذا الجهاز!
    echo     يرجى تحميل وتثبيت Node.js (الإصدار 18 أو أحدث) من:
    echo     https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. إنشاء ملف .env إذا لم يكن موجوداً
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [*] تم إنشاء ملف .env الافتراضي بنجاح.
    )
)

:: 3. التحقق من تثبيت مكتبات n8n
if not exist "node_modules\n8n\bin\n8n" (
    echo [*] تثبيت حزم n8n للمرة الأولى (يرجى الانتظار بضع دقائق)...
    call npm install
)

:: 4. التحقق من تثبيت مكتبات الواجهة الأمامية
if not exist "frontend\node_modules" (
    echo [*] تثبيت حزم الواجهة الأمامية...
    cd frontend
    call npm install
    cd ..
)

:: 5. تشغيل خادم n8n في الخلفية
echo [*] جاري تشغيل خادم n8n على المنفذ 5678...
call start-n8n.bat

:: 6. تشغيل الواجهة الأمامية
echo [*] جاري تشغيل الواجهة الأمامية على المنفذ 5180...
start "ASAAS-Frontend-UI" /min cmd /c "cd /d "%~dp0frontend" && npm run dev -- --host 0.0.0.0 --port 5180"

:: 7. انتظار ثوانٍ للتأكد من الجاهزية ثم فتح المتصفح
timeout /t 3 /nobreak >nul
echo.
echo ======================================================================
echo [✓] تم تشغيل كافة الخدمات بنجاح!
echo  - الواجهة التفاعلية للمستخدم:  http://localhost:5180
echo  - لوحة تحكم سير العمل (n8n):   http://localhost:5678
echo ======================================================================
echo.
echo لفتح الواجهة التفاعلية في المتصفح تلقائياً...
start http://localhost:5180
