@echo off
REM Portion — manual Garmin sync. Double-click to pull wellness + activities.
title Portion - Garmin Sync
cd /d "C:\Users\jkond\Desktop\ProgressAppProject\portion"
call "C:\Program Files\nodejs\npm.cmd" run garmin
echo.
echo Done. You can close this window.
pause
