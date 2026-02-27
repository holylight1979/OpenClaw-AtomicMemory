@echo off
chcp 65001 >nul
title OpenClaw Launcher
echo ========================================
echo   OpenClaw - Starting...
echo ========================================
echo.

:: Step 1: Install gateway as Scheduled Task (idempotent, safe to re-run)
echo [1/4] Installing gateway service (if needed)...
openclaw gateway install >nul 2>&1

:: Step 2: Start gateway service
echo [2/4] Starting gateway...
openclaw gateway start >nul 2>&1
timeout /t 3 /nobreak >nul

:: Step 3: Start Bridge Service (hidden window)
echo [3/4] Starting bridge service...
set BRIDGE_TOKEN=openclaw-bridge-default-token
powershell -Command "Start-Process node -ArgumentList 'C:\OpenClawWorkspace\scripts\openclaw-bridge-server.js' -WindowStyle Hidden"
timeout /t 2 /nobreak >nul

:: Step 4: Start ngrok (hidden window, no console flash)
echo [4/4] Starting ngrok...
powershell -Command "Start-Process ngrok -ArgumentList 'http 18789' -WindowStyle Hidden"
timeout /t 4 /nobreak >nul

:: Show ngrok URL
echo.
echo --- ngrok URL (update LINE webhook if changed) ---
curl -s http://127.0.0.1:4040/api/tunnels 2>nul | findstr "public_url"
echo.
echo ------------------------------------------------

:: Verify
echo.
openclaw gateway status 2>nul
echo.
echo ========================================
echo   OpenClaw is running!
echo   Dashboard: http://127.0.0.1:18789/
echo ========================================
echo.
pause
