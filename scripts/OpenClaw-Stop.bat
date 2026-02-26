@echo off
chcp 65001 >nul
title OpenClaw Shutdown
echo ========================================
echo   OpenClaw - Stopping...
echo ========================================
echo.

:: Kill ngrok
echo [1/2] Stopping ngrok...
taskkill /F /IM ngrok.exe >nul 2>&1
if %errorlevel% equ 0 (echo   ngrok stopped.) else (echo   ngrok was not running.)

:: Kill OpenClaw Gateway (node process running openclaw gateway)
echo [2/2] Stopping OpenClaw Gateway...
set found=0
for /f "tokens=2 delims==" %%i in ('wmic process where "CommandLine like '%%openclaw%%gateway%%'" get ProcessId /value 2^>nul ^| findstr "ProcessId"') do (
    taskkill /F /PID %%i >nul 2>&1
    set found=1
)
if %found% equ 1 (echo   Gateway stopped.) else (echo   Gateway was not running.)

echo.
echo ========================================
echo   OpenClaw stopped.
echo ========================================
echo.
timeout /t 3 /nobreak >nul
