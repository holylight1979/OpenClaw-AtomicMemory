@echo off
chcp 65001 >nul
title OpenClaw Shutdown
echo ========================================
echo   OpenClaw - Stopping...
echo ========================================
echo.

:: Stop bridge service
echo [1/3] Stopping bridge service...
powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like '*bridge-server*'} | Stop-Process -Force -ErrorAction SilentlyContinue"
echo   Bridge service stopped.

:: Stop ngrok
echo [2/3] Stopping ngrok...
taskkill /F /IM ngrok.exe >nul 2>&1
if %errorlevel% equ 0 (echo   ngrok stopped.) else (echo   ngrok was not running.)

:: Stop gateway via native service management
echo [3/3] Stopping gateway...
openclaw gateway stop >nul 2>&1
if %errorlevel% equ 0 (echo   Gateway stopped.) else (echo   Gateway was not running.)

echo.
echo ========================================
echo   OpenClaw stopped.
echo ========================================
echo.
timeout /t 3 /nobreak >nul
