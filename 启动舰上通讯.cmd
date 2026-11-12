@echo off
setlocal
cd /d "%~dp0"
where py.exe >nul 2>nul
if errorlevel 1 goto use_python
py -3 -X utf8 "src\ai\server.py" --open %*
goto finished
:use_python
python -X utf8 "src\ai\server.py" --open %*
:finished
if errorlevel 1 pause
