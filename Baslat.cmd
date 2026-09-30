@echo off
setlocal
cd /d "%~dp0"
if not exist "backend\.venv\Scripts\python.exe" goto needssetup
if not exist "frontend\dist\index.html" goto needssetup
start "RestoPusula Sunucusu" "%ComSpec%" /k "backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000"
powershell -NoProfile -Command "$ready=$false; for($i=0;$i -lt 20;$i++){try{$null=Invoke-RestMethod http://127.0.0.1:8000/api/health -TimeoutSec 1; $ready=$true; break}catch{Start-Sleep -Milliseconds 500}}; if($ready){Start-Process 'http://127.0.0.1:8000'}else{Write-Host 'Sunucu penceresindeki hatayi kontrol edin.'}"
exit /b
:needssetup
echo Once Kurulum.cmd dosyasini calistirin.
pause
exit /b 1
