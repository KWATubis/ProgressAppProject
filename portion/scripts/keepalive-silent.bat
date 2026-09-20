@echo off
REM Portion — silent Supabase keepalive (no pause). Used by the Windows scheduled task.
cd /d "C:\Users\jkond\Desktop\ProgressAppProject\portion"
call "C:\Program Files\nodejs\npm.cmd" run keepalive
