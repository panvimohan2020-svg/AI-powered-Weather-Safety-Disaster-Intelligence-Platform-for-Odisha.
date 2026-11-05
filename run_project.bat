@echo off
echo ========================================================
echo   Starting Odisha WRI Backend & Frontend Servers
echo ========================================================

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Odisha-WRI Backend (FastAPI)" cmd /k "cd /d "%SCRIPT_DIR%" && .\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Vite React Frontend on http://localhost:5173 ...
start "Odisha-WRI Frontend (Vite)" cmd /k "cd /d "%SCRIPT_DIR%wri-frontend" && npm run dev"

echo.
echo Both servers started in separate terminal windows!
echo - Frontend: http://localhost:5173
echo - Backend API: http://127.0.0.1:8000
echo - Swagger Docs: http://127.0.0.1:8000/docs
echo ========================================================
pause

