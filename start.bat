@echo off
setlocal

set ROOT=%~dp0
set SERVER=%ROOT%server
set CLIENT=%ROOT%client

echo Starting PWA Offline Sync Engine...

:: ── Backend ──────────────────────────────────────────────────────────────────
if not exist "%SERVER%\.venv" (
    echo [Server] Creating Python virtual environment...
    python -m venv "%SERVER%\.venv"
)

echo [Server] Installing dependencies...
"%SERVER%\.venv\Scripts\pip.exe" install -r "%SERVER%\requirements.txt" -q

echo [Server] Launching FastAPI on http://localhost:8000
start "FastAPI Server" cmd /k "cd /d "%SERVER%" && .\.venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload"

:: ── Frontend ──────────────────────────────────────────────────────────────────
if not exist "%CLIENT%\node_modules" (
    echo [Client] Installing npm dependencies...
    npm install --prefix "%CLIENT%"
)

echo [Client] Launching Vite on http://localhost:5173
start "Vite Dev Server" cmd /k "cd /d "%CLIENT%" && npm run dev"

echo.
echo  Both servers started in separate windows.
echo  Open http://localhost:5173 in your browser.
echo.
