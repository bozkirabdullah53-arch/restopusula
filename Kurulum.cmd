@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo RestoPusula kurulumu
echo Python 3.11+ ve Node.js 22.13+ gereklidir.
where py >nul 2>nul
if errorlevel 1 goto nopython
where npm >nul 2>nul
if errorlevel 1 goto nonode
py -3 -c "import sys; assert sys.version_info >= (3,11), 'Python 3.11 veya daha yenisi gerekli'"
if errorlevel 1 goto failed
if not exist "backend\.venv\Scripts\python.exe" py -3 -m venv backend\.venv
if errorlevel 1 goto failed
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if errorlevel 1 goto failed
pushd frontend
call npm ci --no-audit --no-fund
if errorlevel 1 goto frontendfailed
call npm run build
if errorlevel 1 goto frontendfailed
popd
backend\.venv\Scripts\python.exe scripts\make_preview.py
if errorlevel 1 goto failed
echo.
echo Kurulum tamamlandi. Uygulamayi Baslat.cmd ile acin.
pause
exit /b 0
:frontendfailed
popd
goto failed
:nopython
echo Python bulunamadi. python.org adresinden Python 3.11+ kurun.
echo Kurulumda Python Launcher secenegini etkinlestirin.
goto failed
:nonode
echo Node.js bulunamadi. nodejs.org adresinden Node.js 22.13+ kurun.
:failed
echo Islem tamamlanamadi. Yukaridaki hatayi kontrol edin.
pause
exit /b 1
