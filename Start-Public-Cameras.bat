@echo off
setlocal EnableExtensions
cd /d "%~dp0"

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install the LTS build from https://nodejs.org
  echo then double-click this file again.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo npm.cmd install failed.
    pause
    exit /b 1
  )
)

echo Building Public Cameras...
call npm.cmd run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

set PORT=4173
echo Starting local server at http://127.0.0.1:%PORT%/
echo Leave this window open. Close it to stop the app.
start "" cmd /c "timeout /t 2 /nobreak >nul & start "" "http://127.0.0.1:%PORT%/""
call npm.cmd run preview -- --host 127.0.0.1 --port %PORT% --strictPort
endlocal
