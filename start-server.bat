@echo off
title KLE Tech IT Asset & Procurement System
echo ===================================================
echo  Starting KLE Tech IT Asset & Procurement System
echo ===================================================
echo.

REM 1. Ensure PostgreSQL is started
echo [1/3] Checking PostgreSQL database service...
net start postgresql-x64-18 >nul 2>&1
if %ERRORLEVEL% neq 0 (
    start "" /B "D:\PostgreSQL\bin\postgres.exe" -D "D:\PostgreSQL\data" >nul 2>&1
)

REM 2. Wait 2 seconds for DB readiness
timeout /t 2 /nobreak >nul

REM 3. Launch default browser
echo [2/3] Opening portal in browser...
start http://localhost:3000

REM 4. Start Node.js application server
echo [3/3] Starting Node Application Server...
echo Server active at http://localhost:3000. Keep this window open while using the portal.
echo Press Ctrl+C to shut down the server.
echo.
cd /d "%~dp0"
node server/app.js
pause
