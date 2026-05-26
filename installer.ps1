Write-Host "Patient Management System Installer" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Build the application
Write-Host "Building desktop application..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host "You can find the installer in the 'dist' folder" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"