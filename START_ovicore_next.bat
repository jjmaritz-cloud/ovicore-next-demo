@echo off
title OviCore Next Launcher

echo ==========================================
echo Starting OviCore Next
echo ==========================================
echo.

cd /d C:\Projects\OviCore_Next.js

echo Starting FastAPI backend on http://localhost:8000 ...
start "OviCore Backend - FastAPI" cmd /k "cd /d C:\Projects\OviCore_Next.js\backend && .venv\Scripts\activate && python -m uvicorn app.main:app --reload --port 8000"

echo Waiting for backend to start...
timeout /t 4 /nobreak >nul

echo Starting Next.js frontend on http://localhost:3000 ...
start "OviCore Frontend - Next.js" cmd /k "cd /d C:\Projects\OviCore_Next.js\frontend && npm run dev"

echo Waiting for frontend to start...
timeout /t 6 /nobreak >nul

echo Opening OviCore Planning page...
start http://localhost:3000/planning

echo.
echo OviCore Next is starting.
echo Keep the backend and frontend command windows open while working.
echo.
pause
