# Dr Amin PMS — Desktop (Electron)

The desktop app wraps the same web UI in an Electron window and auto-starts the backend.

## Prerequisites

- Node.js 20+
- `npm install` from the project root

## Launch

### Browser (recommended for daily use)

```bash
npm start
```

Or double-click **`Saydoc.bat`** (Windows).

### Desktop (Electron)

```bash
npm run electron-dev
```

Or double-click **`launch-app.bat`** (Windows).

## Features

- Auto-starts `backend/server.js` when the backend is not already running
- System tray and application menu (File, View, Patient, Help)
- Keyboard shortcuts (via menu and Ctrl+N/F/D/P in the renderer)
- Export menu hooks (CSV / Excel / PDF when those buttons exist in the UI)

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Backend + browser at http://localhost:3000 |
| `npm run dev` | Backend with nodemon |
| `npm run electron-dev` | Backend + Electron window |
| `npm run electron` | Electron only (backend must already be running) |

## Troubleshooting

**Port 3000 in use:** Stop other apps on that port or set `PORT` in `.env`.

**Backend fails to start:** Run `npm start` in a terminal and check the error output.

**Menu shortcuts do nothing:** Ensure you launched via Electron (`npm run electron-dev`), not only the browser.

## Architecture

```
electron/main.js     → BrowserWindow, tray, menu, backend spawn
electron/preload.js   → Safe IPC bridge (window.electron)
frontend/src/main.js  → initElectron() listens for navigate/export events
backend/server.js     → Express API + SPA static files
```
