@echo off
title Healing Layer Dashboard
echo.
echo  ╦ ╦╔═╗╔═╗╦  ╦╔╗╔╔═╗  ╦  ╔═╗╦ ╦╔═╗╦═╗
echo  ╠═╣║╣ ╠═╣║  ║║║║║ ╦  ║  ╠═╣╚╦╝║╣ ╠╦╝
echo  ╩ ╩╚═╝╩ ╩╩═╝╩╝╚╝╚═╝  ╩═╝╩ ╩ ╩ ╚═╝╩╚═
echo.
echo  Observation - Detection - Healing Pipeline
echo ────────────────────────────────────────────
echo.

:: Check Docker is running
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Docker is not running!
    echo  Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)

echo  [OK] Docker is running
echo.

:: Stop any old containers
echo  Stopping any existing containers...
docker-compose down --remove-orphans > nul 2>&1

:: Build + start
echo  Building and starting all services...
echo  (This may take 1-2 minutes on first run)
echo.
docker-compose up --build -d

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] docker-compose failed.
    pause
    exit /b 1
)

echo.
echo  Waiting for services to become healthy...

set /a attempts=0
:wait_loop
set /a attempts+=1
if %attempts% gtr 30 (
    echo  [WARN] Backend took too long — it might still be starting up.
    goto :show_info
)
timeout /t 3 /nobreak > nul
curl -s -f http://localhost:8000/health > nul 2>&1
if %errorlevel% equ 0 goto :ready
echo  Waiting... (%attempts%/30)
goto :wait_loop

:ready
echo  [OK] Backend is healthy!

:show_info
echo.
echo ════════════════════════════════════════════════
echo   HEALING LAYER DASHBOARD is LIVE!
echo ════════════════════════════════════════════════
echo.
echo   Dashboard:  http://localhost:3000
echo   Backend:    http://localhost:8000
echo   API Docs:   http://localhost:8000/docs
echo.
echo   Traffic is auto-generated — the dashboard
echo   will populate with live data automatically.
echo.
echo ─────────────────────────────────────────────────
echo   Press any key to open the dashboard
echo ─────────────────────────────────────────────────
pause > nul
start http://localhost:3000

echo.
echo   Running! To stop: docker-compose down
echo.
