' Portion — launches the silent Supabase keepalive with no visible window.
' Used by the Windows scheduled task so background pings never flash a console.
CreateObject("Wscript.Shell").Run "cmd /c ""C:\Users\jkond\Desktop\ProgressAppProject\portion\scripts\keepalive-silent.bat""", 0, False
