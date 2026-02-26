@echo off
chcp 65001 >nul
title OpenClaw Launcher
echo ========================================
echo   OpenClaw - Starting...
echo ========================================
echo.

:: Start ngrok (for LINE webhook)
echo [1/2] Starting ngrok...
start "" /b ngrok http 18789 >nul 2>&1
timeout /t 4 /nobreak >nul

:: Show ngrok URL
echo.
echo --- ngrok URL (update LINE webhook if changed) ---
curl -s http://127.0.0.1:4040/api/tunnels 2>nul | findstr "public_url"
echo.
echo ------------------------------------------------
echo.

:: Start OpenClaw Gateway
echo [2/2] Starting OpenClaw Gateway...
start "" /b openclaw gateway >nul 2>&1
timeout /t 5 /nobreak >nul

:: Verify
echo.
openclaw status 2>nul | findstr /C:"Gateway" /C:"Discord" /C:"LINE"
echo.
echo ========================================
echo   OpenClaw is running!
echo   ngrok + Gateway started (background)
echo   Dashboard: http://127.0.0.1:18789/
echo ========================================
echo.
pause
