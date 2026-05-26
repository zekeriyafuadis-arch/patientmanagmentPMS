const { app, BrowserWindow, ipcMain, Menu, Tray, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
let tray = null;
let backendProcess = null;
let isQuitting = false;

// Check if server is running
function isServerRunning(port = 3000) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/',
      method: 'HEAD',
      timeout: 1000
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.end();
  });
}

// Start backend server
function startBackendServer() {
  return new Promise((resolve, reject) => {
    const backendPath = path.join(__dirname, '..', 'app.js');
    
    if (!fs.existsSync(backendPath)) {
      reject(new Error(`Backend file not found: ${backendPath}`));
      return;
    }
    
    backendProcess = spawn('node', [backendPath], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Backend]: ${output}`);
      if (output.includes('Server running on http://localhost:3000')) {
        resolve();
      }
    });
    
    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error]: ${data}`);
    });
    
    backendProcess.on('error', (err) => {
      reject(err);
    });
    
    backendProcess.on('exit', (code) => {
      if (!isQuitting) {
        console.log(`Backend server exited with code ${code}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('server-down');
        }
      }
    });
  });
}

// Stop backend server
function stopBackendServer() {
  return new Promise((resolve) => {
    if (backendProcess && !backendProcess.killed) {
      backendProcess.kill('SIGTERM');
      setTimeout(resolve, 1000);
    } else {
      resolve();
    }
  });
}

// Create the main application window
async function createMainWindow() {
  // Start backend if not running
  const isRunning = await isServerRunning();
  if (!isRunning) {
    try {
      await startBackendServer();
      // Wait a bit for server to fully initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Failed to start backend:', error);
      showErrorDialog('Failed to start backend server', error.message);
      app.quit();
      return;
    }
  }
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    frame: true,
    titleBarStyle: 'default',
    show: false,
    backgroundColor: '#f7fafc'
  });
  
  // Load the application
  mainWindow.loadURL('http://localhost:3000');
  
  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });
  
  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  
  // Handle window close
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      showExitConfirmation();
    }
  });
  
  // Create application menu
  createApplicationMenu();
  
  // Create tray icon
  createTrayIcon();
  
  return mainWindow;
}

// Create application menu
function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Patient',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('navigate', 'register');
            }
          }
        },
        {
          label: 'Search Patients',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('navigate', 'search');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Export Data',
          submenu: [
            {
              label: 'Export to CSV',
              click: () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('export-data', 'csv');
                }
              }
            },
            {
              label: 'Export to Excel',
              click: () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('export-data', 'excel');
                }
              }
            },
            {
              label: 'Export to PDF',
              click: () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('export-data', 'pdf');
                }
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.reload();
            }
          }
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'F11',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              const webContents = mainWindow.webContents;
              webContents.setZoomLevel(webContents.getZoomLevel() + 0.5);
            }
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              const webContents = mainWindow.webContents;
              webContents.setZoomLevel(webContents.getZoomLevel() - 0.5);
            }
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.setZoomLevel(0);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.openDevTools();
            }
          }
        }
      ]
    },
    {
      label: 'Patient',
      submenu: [
        {
          label: 'All Patients',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('navigate', 'patients');
            }
          }
        },
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('navigate', 'dashboard');
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/your-repo/patient-management-system');
          }
        },
        {
          label: 'About',
          click: () => {
            showAboutDialog();
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create system tray icon
function createTrayIcon() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  
  if (fs.existsSync(iconPath)) {
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            if (mainWindow.isMinimized()) mainWindow.restore();
          }
        }
      },
      {
        label: 'Dashboard',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('navigate', 'dashboard');
            mainWindow.show();
          }
        }
      },
      {
        label: 'Register Patient',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('navigate', 'register');
            mainWindow.show();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Exit',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);
    
    tray.setToolTip('Patient Management System');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          if (mainWindow.isMinimized()) mainWindow.restore();
        }
      }
    });
  }
}

// Show exit confirmation dialog
function showExitConfirmation() {
  const { dialog } = require('electron');
  
  const result = dialog.showMessageBoxSync(mainWindow, {
    type: 'question',
    buttons: ['Exit', 'Minimize to Tray', 'Cancel'],
    defaultId: 2,
    cancelId: 2,
    title: 'Confirm Exit',
    message: 'Do you want to exit the application?',
    detail: 'The application will continue running in the system tray if you minimize it.'
  });
  
  if (result === 0) {
    isQuitting = true;
    app.quit();
  } else if (result === 1) {
    mainWindow.hide();
  }
}

// Show error dialog
function showErrorDialog(title, message) {
  const { dialog } = require('electron');
  dialog.showErrorBox(title, message);
}

// Show about dialog
function showAboutDialog() {
  const { dialog } = require('electron');
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About Patient Management System',
    message: 'Patient Management System v2.0.0',
    detail: 'Healthcare Management System\n\nDeveloped for efficient patient record management\n\n© 2024 Healthcare HMS',
    buttons: ['OK']
  });
}

// App event handlers
app.whenReady().then(() => {
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  isQuitting = true;
  await stopBackendServer();
});

app.on('will-quit', () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
});

// Handle second instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// IPC handlers for renderer process
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});