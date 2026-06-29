@echo off
title Delure — Dev Server
cd /d "%~dp0"

echo.
echo  Starting Delure...
echo  Please wait, opening in browser shortly.
echo.

:: Opens the browser after 3 seconds (time for the server to start)
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173"

:: Starts the server (Vite)
npm run dev:local

pause
