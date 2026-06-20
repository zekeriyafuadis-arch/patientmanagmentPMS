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

Open **http://localhost:3000**

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

## Environment

Copy `.env.example` to `.env` and adjust as needed. See `.env.example` for all variables.

## Documentation

- [SQLITE_SETUP.md](SQLITE_SETUP.md) — local setup details
- [RESTRUCTURE_PLAN.md](RESTRUCTURE_PLAN.md) — architecture roadmap

## Tech stack

- **Frontend:** Vanilla JS SPA
- **Backend:** Node.js + Express
- **Database:** SQLite3
