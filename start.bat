@echo off
echo Starting AI Object Detection Backend and ngrok...

:: Start the Python backend using PowerShell in a new window
start powershell -NoExit -Command "cd backend; ..\..\.venv\Scripts\Activate.ps1; uvicorn main:app --host 0.0.0.0 --port 8000"

:: Wait 3 seconds for it to boot up
timeout /t 3 /nobreak > NUL

:: Start ngrok using PowerShell in another new window
start powershell -NoExit -Command "ngrok http --domain=convergent-defencelessly-jolene.ngrok-free.dev 8000"

echo.
echo ========================================================
echo All servers are starting in new windows!
echo Once the ngrok window says 'Online', you can open the 
echo Vercel link on your phone:
echo https://frontend-olive-eight-16.vercel.app
echo ========================================================
echo.
pause
