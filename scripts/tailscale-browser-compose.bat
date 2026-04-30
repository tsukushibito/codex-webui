@echo off
setlocal

set "PS_SCRIPT=%~dp0tailscale-browser-compose.ps1"

if not exist "%PS_SCRIPT%" (
  echo [tailscale-browser-compose] error: PowerShell wrapper not found: %PS_SCRIPT% 1>&2
  exit /b 1
)

where pwsh >nul 2>nul
if %ERRORLEVEL% equ 0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*
)

exit /b %ERRORLEVEL%
