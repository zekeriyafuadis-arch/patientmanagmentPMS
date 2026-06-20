@echo off
cd /d "%~dp0"
echo Starting Dr Amin Specialty Dental Clinic PMS...
start "Dr Amin Dental PMS" cmd /k "npm start"
timeout /t 5 /nobreak >nul
start http://localhost:3000
