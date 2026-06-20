# Dr Amin Specialty Dental Clinic PMS — SQLite Mode

The app now runs on a **local SQLite database** with an Express API. No Firebase setup is required.

## Quick start

```bash
npm install
npm start
```

Open **http://localhost:3000**

### First login

Copy `.env.example` to `.env` and set `PMS_ADMIN_USERNAME`, `PMS_ADMIN_PASSWORD`, and `PMS_EMAIL_DOMAIN` (default `@pws.com`). On first run the server creates the admin account from those values. Sign in with **username only** — the app appends the domain automatically.

Change the admin password after first login via **Settings → Change Password**.

## Database location

- **SQLite file:** `patientsData/patientsdata.db`
- **X-ray uploads:** `patientsData/xrays/{patientId}/`

## Backup

```bash
npm run backup
```

Or use **Settings → Data & Backup → Create Backup** in the app (includes database + X-rays).

Backups are stored in `patientsData/backups/` (last 10 retained).

## Export

Admins can export from **Settings**:

- **Export All (JSON)** — full clinic snapshot (patients, appointments, billing, clinical)
- **Export Patients (CSV)** — patient list for spreadsheets

## Audit log

Administrators can view recent actions (logins, patient changes, payments, backups) under **Settings → Audit Log**.

## Health check

```
GET http://localhost:3000/api/v1/admin/health
```

Returns `{ status: "ok", version: "3.0.0", database: "sqlite" }`.

## API

All frontend services call `/api/v1/*` endpoints. Authentication uses JWT tokens stored in the browser session.

## Environment

Copy `.env.example` to `.env` in the project root. The server loads it automatically on startup.

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Pino log level |
| `JWT_SECRET` | (required in production) | Token signing secret |
| `JWT_EXPIRES_IN` | `24h` / `7d` | JWT lifetime (production / development) |
| `PMS_CORS_ORIGINS` | unset | Extra allowed origins in production |
| `RATE_LIMIT_MAX` | `300` | API requests per 15 min |
| `RATE_LIMIT_AUTH_MAX` | `10` | Login attempts per 15 min |
| `RATE_LIMIT_BACKUP_MAX` | `5` | Backup requests per hour |
| `PMS_DISABLE_RATE_LIMIT` | unset | Set `1` to disable limits (debug only) |
| `PMS_DATA_DIR` | `./patientsData` | Runtime data folder |

See `.env.example` for full documentation.
