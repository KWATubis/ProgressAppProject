' Portion — launches the silent Garmin sync with no visible window.
' Used by the Windows scheduled task so background syncs never flash a console.
CreateObject("Wscript.Shell").Run "cmd /c ""C:\Users\jkond\Desktop\ProgressAppProject\portion\scripts\sync-garmin-silent.bat""", 0, False
