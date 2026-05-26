const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // Navigation
  onNavigate: (callback) => {
    ipcRenderer.on('navigate', (event, page) => callback(page));
  },
  
  // Export
  onExportData: (callback) => {
    ipcRenderer.on('export-data', (event, type) => callback(type));
  },
  
  // Server status
  onServerDown: (callback) => {
    ipcRenderer.on('server-down', () => callback());
  },
  
  // Remove listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('navigate');
    ipcRenderer.removeAllListeners('export-data');
    ipcRenderer.removeAllListeners('server-down');
  }
});