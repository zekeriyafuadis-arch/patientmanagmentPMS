# Dr Amin Specialty Dental Clinic PMS

Local dental clinic management system for **Dr Amin Specialty Dental Clinic**. Runs on your PC with **SQLite** — no cloud account required.

## Features

- Patient registry with dental fields (insurance, recalls, allergies)
- Appointments calendar (day/week views)
- Clinical records: odontogram, treatment plans, SOAP notes, X-rays
- Billing: invoices, payments, receipts
- Recall management
- Staff roles: admin, dentist, receptionist
- Audit log, backup, and full data export

## Quick start

```bash
npm install
npm start
```

Or double-click **`Saydoc.bat`** (Windows).

Open **http://localhost:3000** on this PC, or use a **LAN URL** on phones/tablets (see **Settings → Mobile & Install**).

## Mobile access

1. Start the app: `npm start` (server listens on all interfaces by default).
2. On a phone/tablet on the **same Wi‑Fi**, open the LAN URL shown in **Settings → Mobile & Install** (e.g. `http://192.168.1.x:3000`).
3. **Install to home screen:** use the install banner (Chrome/Edge) or **Share → Add to Home Screen** (Safari on iPhone).

## Download / install

| Option | How |
|--------|-----|
| **Browser (PC)** | `Saydoc.bat` or `npm start` |
| **Desktop app** | `npm run electron-dev` or `launch-app.bat` |
| **Windows installer** | `npm run build:win` → files in `dist/` (NSIS installer + portable `.exe`) |
| **Mobile PWA** | Open LAN URL in browser → Install / Add to Home Screen |

Sign in with the username and password from your `.env` file (`PMS_ADMIN_USERNAME` + `PMS_EMAIL_DOMAIN`). Copy `.env.example` to `.env` and set your credentials before the first run.

## Backup & export

- **Settings → Data & Backup** (admin): one-click backup, JSON export, CSV export
- **CLI:** `npm run backup`
- Backups stored in `patientsData/backups/` (database + X-rays, last 10 kept)

## Data files

| Path | Contents |
|------|----------|
| `patientsData/patientsdata.db` | SQLite database |
| `patientsData/xrays/` | Uploaded X-ray images |
| `patientsData/backups/` | Automated backups |

## Health check

```
GET http://localhost:3000/api/v1/admin/health
```

## Tests

```bash
npm test
```

## Production deployment

This app is designed for **local clinic use** (one PC or trusted office Wi‑Fi). Before going live:

1. Copy `.env.example` to `.env` and set strong values:
   - `NODE_ENV=production` (or run `npm run start:prod`)
   - `JWT_SECRET` — long random string (32+ characters)
   - `PMS_ADMIN_PASSWORD` — at least 8 characters with letters and numbers
2. Start with **`npm run start:prod`** (Electron desktop builds set production automatically).
3. Change the admin password after first login (**Settings → Change Password**).
4. Keep the server on your **clinic LAN only** — block port 3000 from the public internet in Windows Firewall.
5. Enable daily backups (`PMS_AUTO_BACKUP=1`, default on) and test restore in **Settings → Data & Backup**.
6. Do **not** set `PMS_DISABLE_RATE_LIMIT=1` or `PMS_SEED_DEMO=1` in production.

Production mode enables: security headers (Helmet), restricted CORS, stronger passwords, shorter JWT sessions (24h), and startup checks for weak secrets.

## Environment

Copy `.env.example` to `.env` and adjust as needed. See `.env.example` for all variables.

## Documentation

- [SQLITE_SETUP.md](SQLITE_SETUP.md) — local setup details
- [RESTRUCTURE_PLAN.md](RESTRUCTURE_PLAN.md) — architecture roadmap

## Tech stack

- **Frontend:** Vanilla JS SPA
- **Backend:** Node.js + Express
- **Database:** SQLite3
