@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM  SmartAttend — Start All Services
REM  Starts: Presence Service (Node.js) → Backend (Spring Boot) → Frontend (React)
REM ═══════════════════════════════════════════════════════════════════════════════

title SmartAttend Launcher
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║          SmartAttend — Service Launcher              ║
echo  ║   Network-Based Attendance System                    ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

REM ─── Check prerequisites ──────────────────────────────────────────────────────
echo [1/6] Checking prerequisites...

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)
echo   ✓ Node.js found

where java >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Java not found. Install JDK 17+
    pause
    exit /b 1
)
echo   ✓ Java found

where mvn >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [WARNING] Maven not found in PATH. Trying mvnw.cmd...
    set USE_WRAPPER=1
) else (
    echo   ✓ Maven found
    set USE_WRAPPER=0
)

echo.

REM ─── Install dependencies if needed ───────────────────────────────────────────
echo [2/6] Checking dependencies...

if not exist "presence-service\node_modules" (
    echo   Installing presence-service dependencies...
    cd presence-service
    call npm.cmd install
    cd ..
)
echo   ✓ Presence service deps OK

if not exist "frontend\node_modules" (
    echo   Installing frontend dependencies...
    cd frontend
    call npm.cmd install
    cd ..
)
echo   ✓ Frontend deps OK

echo.

REM ─── Start Presence Service ───────────────────────────────────────────────────
echo [3/6] Starting Presence Service (port 3001/3002)...
start "SmartAttend - Presence Service" cmd /k "cd /d %~dp0presence-service && title SmartAttend - Presence Service && color 0B && echo Starting Presence Service... && node src/index.js"
timeout /t 3 /nobreak >nul
echo   ✓ Presence Service starting...

echo.

REM ─── Start Backend ────────────────────────────────────────────────────────────
echo [4/6] Starting Backend (port 8080)...
if %USE_WRAPPER%==1 (
    start "SmartAttend - Backend" cmd /k "cd /d %~dp0backend && title SmartAttend - Backend && color 0D && echo Starting Spring Boot Backend... && mvnw.cmd spring-boot:run"
) else (
    start "SmartAttend - Backend" cmd /k "cd /d %~dp0backend && title SmartAttend - Backend && color 0D && echo Starting Spring Boot Backend... && mvn spring-boot:run"
)
echo   ✓ Backend starting (this may take 30-60s on first run)...

echo.

REM ─── Wait for backend to be ready ────────────────────────────────────────────
echo [5/6] Waiting for backend to initialize...
timeout /t 10 /nobreak >nul

REM ─── Start Frontend ──────────────────────────────────────────────────────────
echo [6/6] Starting Frontend (port 5173)...
start "SmartAttend - Frontend" cmd /k "cd /d %~dp0frontend && title SmartAttend - Frontend && color 0E && echo Starting React Frontend... && npx.cmd vite --host"
timeout /t 3 /nobreak >nul
echo   ✓ Frontend starting...

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║  All services launched!                              ║
echo  ║                                                      ║
echo  ║  Presence Service:  http://localhost:3001             ║
echo  ║  Backend API:       http://localhost:8080             ║
echo  ║  Frontend UI:       http://localhost:5173             ║
echo  ║                                                      ║
echo  ║  Close the individual windows to stop services.      ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

pause
