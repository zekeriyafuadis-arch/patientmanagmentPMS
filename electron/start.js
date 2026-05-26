const { spawn } = require('child_process');
const { exec } = require('child_process');
const path = require('path');

console.log('Starting Patient Management System...');

// Check if backend is already running
const net = require('net');
const client = new net.Socket();

client.connect(3000, 'localhost', () => {
  console.log('Backend server is already running');
  client.destroy();
  startElectron();
});

client.on('error', () => {
  console.log('Starting backend server...');
  startBackend();
});

function startBackend() {
  const backend = spawn('node', ['app.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });
  
  backend.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });
  
  // Wait for backend to start
  setTimeout(() => {
    startElectron();
  }, 3000);
}

function startElectron() {
  console.log('Starting Electron application...');
  const electron = spawn('npx', ['electron', '.'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });
  
  electron.on('close', (code) => {
    console.log(`Electron exited with code ${code}`);
    process.exit(code);
  });
}