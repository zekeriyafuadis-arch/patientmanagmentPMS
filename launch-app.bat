@echo off
title Dr Amin Specialty Dental Clinic PMS
echo Starting Dr Amin Specialty Dental Clinic PMS...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

echo Launching desktop application...
call npm run electron-dev

pause
