@echo off
REM Portion — silent Garmin sync (no pause). Used by the Windows scheduled task.
cd /d "C:\Users\jkond\Desktop\ProgressAppProject\portion"
call "C:\Program Files\nodejs\npm.cmd" run garmin
