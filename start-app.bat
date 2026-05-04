@echo off
set "ROOT=%~dp0"
if exist "%ROOT%.venv-release\Scripts\python.exe" (
  "%ROOT%.venv-release\Scripts\python.exe" "%ROOT%webapp\desktop.py" %*
) else (
  python "%ROOT%webapp\desktop.py" %*
)
