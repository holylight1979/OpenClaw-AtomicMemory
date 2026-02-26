@echo off
chcp 65001 >nul
title OpenClaw Shutdown
echo ========================================
echo   OpenClaw - Stopping...
echo ========================================
echo.

:: Stop ngrok
echo [1/2] Stopping ngrok...
taskkill /F /IM ngrok.exe >nul 2>&1
if %errorlevel% equ 0 (echo   ngrok stopped.) else (echo   ngrok was not running.)

:: Stop gateway via native service management
echo [2/2] Stopping gateway...
openclaw gateway stop >nul 2>&1
if %errorlevel% equ 0 (echo   Gateway stopped.) else (echo   Gateway was not running.)

echo.
echo ========================================
echo   OpenClaw stopped.
echo ========================================
echo.
timeout /t 3 /nobreak >nul
