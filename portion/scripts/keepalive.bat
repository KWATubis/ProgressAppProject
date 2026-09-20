@echo off
REM Portion — manual Supabase keepalive. Double-click to ping the DB now.
title Portion - Supabase Keepalive
cd /d "C:\Users\jkond\Desktop\ProgressAppProject\portion"
call "C:\Program Files\nodejs\npm.cmd" run keepalive
echo.
echo Done. You can close this window.
pause
