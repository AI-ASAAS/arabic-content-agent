@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ======================================================================
echo    أداة تجهيز وضغط المشروع للإرسال (Package for Sharing)
echo ======================================================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0package-for-sharing.ps1"

echo.
pause
