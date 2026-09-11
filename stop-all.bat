@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM  SmartAttend — Stop All Services
REM  Kills all running SmartAttend processes
REM ═══════════════════════════════════════════════════════════════════════════════

title SmartAttend — Stopping Services
color 0C

echo.
echo  Stopping SmartAttend services...
echo.

REM Kill Node.js processes (presence service + frontend dev server)
taskkill /FI "WINDOWTITLE eq SmartAttend - Presence Service" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq SmartAttend - Frontend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq SmartAttend - Backend" /F >nul 2>&1

echo  ✓ All SmartAttend services stopped.
echo.

timeout /t 2 /nobreak >nul
