@echo off
setlocal
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" goto needssetup
.venv\Scripts\python.exe backup.py
pause
exit /b
:needssetup
echo Once Kurulum.cmd dosyasini calistirin.
pause
exit /b 1
