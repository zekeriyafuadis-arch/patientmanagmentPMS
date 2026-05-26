@echo off
title Patient Management System
echo Starting Patient Management System...
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

:: Start the application
echo Launching application...
call npm run start

pause