@echo off
rem Rebuilds the Go backend binary (netronome-bin\netronome.exe).
rem Run this after changing any Go code, then restart start.bat.
setlocal
cd /d "%~dp0"

where go >nul 2>nul
if errorlevel 1 (
  echo [netronome] ERROR: Go is not installed. Install it from https://go.dev/dl/
  pause
  exit /b 1
)

if not exist "..\netronome-bin" mkdir "..\netronome-bin"
echo [netronome] Building backend...
go build -o "..\netronome-bin\netronome.exe" .\cmd\netronome
if errorlevel 1 (
  echo [netronome] ERROR: build failed.
  pause
  exit /b 1
)
echo [netronome] Backend rebuilt at ..\netronome-bin\netronome.exe
