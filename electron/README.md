npm install --save-dev electron electron-builder
npm install concurrently wait-on


{
  "name": "patient-management-system",
  "version": "2.0.0",
  "description": "Healthcare Patient Management System - Desktop Application",
  "main": "electron/main.js",
  "author": "Healthcare HMS",
  "license": "MIT",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "electron": "electron .",
    "electron-dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "build": "electron-builder",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.healthcare.patientms",
    "productName": "Patient Management System",
    "directories": {
      "output": "dist"
    },
    "files": [
      "electron/**/*",
      "app.js",
      "src/**/*",
      "config/**/*",
      "Patient-managment/**/*",
      "patientsData/**/*",
      "!**/node_modules/*/{test,__tests__,tests,example,docs,coverage}/**",
      "!**/*.{iml,o,obj,log,lock,md,psd,pyc,pyo,swp,DS_Store}"
    ],
    "win": {
      "target": [
        "nsis",
        "portable"
      ],
      "icon": "electron/assets/icon.ico"
    },
    "mac": {
      "target": [
        "dmg",
        "zip"
      ],
      "icon": "electron/assets/icon.icns",
      "category": "public.app-category.medical"
    },
    "linux": {
      "target": [
        "AppImage",
        "deb"
      ],
      "icon": "electron/assets/icon.png",
      "category": "Medical"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  },
  "dependencies": {
    "express": "^4.18.2",
    "sqlite3": "^5.1.6",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "pdfkit": "^0.14.0",
    "exceljs": "^4.4.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "electron": "^27.0.0",
    "electron-builder": "^24.6.4",
    "concurrently": "^8.2.2",
    "wait-on": "^7.0.2"
  }
}

### Update Patient-managment/src/app.js - Add Electron IPC support:

// Add this at the beginning of app.js
// Check if running in Electron
const isElectron = () => {
  return window && window.process && window.process.type === 'renderer';
};

// Setup Electron IPC listeners
if (isElectron() && window.electron) {
  window.electron.onNavigate((page) => {
    window.location.hash = page;
    if (window.app) {
      window.app.loadPage(page);
    }
  });
  
  window.electron.onExportData((type) => {
    if (type === 'csv') {
      document.getElementById('exportCSVBtn')?.click();
    } else if (type === 'excel') {
      document.getElementById('exportExcelBtn')?.click();
    } else if (type === 'pdf') {
      document.getElementById('exportPDFBtn')?.click();
    }
  });
  
  window.electron.onServerDown(() => {
    Toast.error('Server connection lost. Please restart the application.', 0);
  });
}

// Add to your App class
class App {
  // ... existing code ...
  
  async loadPage(pageName) {
    // Existing code...
    
    // Add keyboard shortcuts for Electron
    if (isElectron()) {
      this.setupKeyboardShortcuts();
    }
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + N - New Patient
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        window.location.hash = 'register';
        this.loadPage('register');
      }
      
      // Ctrl/Cmd + F - Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        window.location.hash = 'search';
        this.loadPage('search');
      }
      
      // Ctrl/Cmd + D - Dashboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        window.location.hash = 'dashboard';
        this.loadPage('dashboard');
      }
      
      // Ctrl/Cmd + P - All Patients
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.location.hash = 'patients';
        this.loadPage('patients');
      }
    });
  }
}

### 8. Create Batch Files for Easy Launch
### Create launch-app.bat (for Windows):

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
call npm run electron-dev

pause

## Create launch-app.sh (for Linux/Mac):

#!/bin/bash

echo "Starting Patient Management System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    echo "Download from: https://nodejs.org/"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the application
echo "Launching application..."
npm run electron-dev

### 9. Create Installer Script
Create installer.ps1 (PowerShell script for Windows):

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

### 11. Create README for Desktop Usage:
Create DESKTOP_README.md:
markdown
# Patient Management System - Desktop Application

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Quick Start

#### Windows:
1. Double-click `launch-app.bat`
2. The application will automatically start

#### Mac/Linux:
1. Run `chmod +x launch-app.sh` (first time only)
2. Double-click `launch-app.sh` or run `./launch-app.sh`

### Building Installers

#### Build for Windows:
```bash
npm run build:win
Build for macOS:
bash
npm run build:mac
Build for Linux:
bash
npm run build:linux



### Features
Auto-start backend - No need to manually start the server

System Tray - Runs in background when minimized

Keyboard Shortcuts:

Ctrl+N - New Patient

Ctrl+F - Search Patients

Ctrl+D - Dashboard

Ctrl+P - All Patients

F11 - Full Screen

Ctrl+R - Refresh

Export Options - Export data from the File menu

Offline First - Works without internet connection

Troubleshooting
Port 3000 already in use:
Close other applications using port 3000

Or modify the port in app.js

Database issues:
Delete patientsData/patientsdata.db and restart

The database will be recreated automatically

Application won't start:
Run npm install to reinstall dependencies

Check Node.js version (requires v14+)

Support
For issues and feature requests, please contact the development team.


##
Now we have a complete desktop application that:

✅ **Auto-starts backend** - No manual server startup needed
✅ **Single executable** - One file to launch everything
✅ **System Tray** - Runs in background
✅ **Keyboard Shortcuts** - Professional shortcuts for common actions
✅ **Custom Menu** - File, View, Patient, Help menus
✅ **Auto-install dependencies** - Checks and installs if missing
✅ **Build installers** - Create .exe, .dmg, .AppImage files
✅ **Offline capable** - Works without internet
✅ **Cross-platform** - Windows, Mac, Linux support

## How to Use:

1. **For Development:**
```bash
npm run electron-dev

##### For Production Build:

bash
# Windows
npm run build:win

# Mac
npm run build:mac

# Linux
npm run build:linux
Simple Launch (Windows):
Double-click launch-app.bat