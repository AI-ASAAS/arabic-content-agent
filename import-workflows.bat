@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ======================================================================
echo    استيراد سير العمل (Workflows) تلقائياً إلى n8n
echo ======================================================================
echo.

if not exist "node_modules\n8n\bin\n8n" (
    echo [!] لم يتم العثور على مكتبات n8n بعد.
    echo     يرجى تشغيل ملف start-all.bat أولاً لتثبيت الحزم، ثم إعادة المحاولة.
    pause
    exit /b 1
)

echo [*] جاري استيراد سير العمل الوكيل المتقدم (agentic_workflow.json)...
node node_modules\n8n\bin\n8n import:workflow --input=agentic_workflow.json

echo.
echo [*] جاري استيراد سير العمل الاحتياطي (baseline_workflow.json)...
node node_modules\n8n\bin\n8n import:workflow --input=baseline_workflow.json

echo.
echo ======================================================================
echo [✓] اكتمل استيراد سير العمل بنجاح!
echo     يمكنك الآن فتح http://localhost:5678 واستعراض الـ Workflows.
echo ======================================================================
pause
