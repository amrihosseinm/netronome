@echo off
rem One-click launcher for Netronome
rem  API  -> http://127.0.0.1:7575
rem  UI   -> http://127.0.0.1:5173
setlocal
cd /d "%~dp0"

rem ── 1. Build backend if missing ─────────────────────────────────────────────
if not exist "..\netronome-bin\netronome.exe" (
  echo [netronome] Backend binary not found - building...
  where go >nul 2>nul
  if errorlevel 1 (
    echo [netronome] ERROR: Go not installed. Get it from https://go.dev/dl/
    pause & exit /b 1
  )
  if not exist "..\netronome-bin" mkdir "..\netronome-bin"
  go build -o "..\netronome-bin\netronome.exe" .\cmd\netronome
  if errorlevel 1 ( echo [netronome] ERROR: build failed. & pause & exit /b 1 )
  echo [netronome] Backend built OK.
)

rem ── 2. Install web deps if missing ─────────────────────────────────────────
if not exist "web\node_modules" (
  echo [netronome] Installing web dependencies...
  pushd web
  call npm install
  if errorlevel 1 ( echo [netronome] ERROR: npm install failed. & popd & pause & exit /b 1 )
  popd
)

rem ── 3. Kill any old instances ──────────────────────────────────────────────
taskkill /F /IM netronome.exe >nul 2>nul
for /f "tokens=5" %%p in ('netstat -aon ^| findstr /c:":5173 " ^| findstr /c:"LISTENING"') do taskkill /F /PID %%p >nul 2>nul
timeout /t 1 /nobreak >nul

rem ── 4. Start backend in its own window ────────────────────────────────────
set "BIN_DIR=%~dp0..\netronome-bin"
start "Netronome API" /D "%BIN_DIR%" cmd /k "netronome.exe serve"

rem ── 5. Start Vite UI in its own window ────────────────────────────────────
start "Netronome UI" /D "%~dp0web" cmd /k "npm run dev:ui"

rem ── 6. Wait until the UI server is actually accepting connections ─────────
echo [netronome] Waiting for UI on http://127.0.0.1:5173 ...
powershell -NoProfile -Command "$ok=$false; for($i=0;$i -lt 120;$i++){ $t=New-Object Net.Sockets.TcpClient; try{ $t.Connect('127.0.0.1',5173); $t.Close(); $ok=$true; break }catch{ Start-Sleep -Milliseconds 500 } }; if(-not $ok){ exit 1 }"
if errorlevel 1 (
  echo [netronome] ERROR: UI server did not start. Check the "Netronome UI" window for errors.
  pause & exit /b 1
)

rem ── 7. Open browser only after the server is ready ─────────────────────────
echo [netronome] Opening browser...
start "" "http://127.0.0.1:5173"

echo.
echo [netronome] UI  : http://127.0.0.1:5173
echo [netronome] API : http://127.0.0.1:7575
echo [netronome] Close the "Netronome API" and "Netronome UI" windows to stop the servers.
echo.
pause
