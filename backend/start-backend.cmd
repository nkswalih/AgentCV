@echo off
title AgentCV API
cd /d "%~dp0"
echo Starting AgentCV API on http://localhost:8000 ...
echo Keep this window open while using the app.
.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
echo.
echo API exited unexpectedly. Press any key to close.
pause >nul
