@echo off
title Tejas Portfolio Local Server
cd /d "%~dp0"
echo ========================================================
echo  Tejas Portfolio Website - Local Development Server
echo ========================================================
echo  Opening http://localhost:8080 in your browser...
echo  Press Ctrl+C in this window anytime to stop the server.
echo ========================================================
echo.

start http://localhost:8080
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '.\serve.ps1' -Raw | Invoke-Expression"
pause
