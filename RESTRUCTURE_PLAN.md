# Dr Amin PMS — Restructure & Firebase Removal Plan

> **Goal:** Remove all Firebase code, adopt a scalable folder structure, connect frontend and backend through a consistent REST API, add rate limiting and structured logging, and enable automatic UI refresh on data changes and logout.

---

## Table of contents

1. [Current state](#current-state)
2. [Target architecture](#target-architecture)
3. [Proposed folder structure](#proposed-folder-structure)
4. [API response contract](#api-response-contract)
5. [Rate limiter](#rate-limiter)
6. [Logger](#logger)
7. [Auto-reload / live sync](#auto-reload--live-sync)
8. [Firebase removal checklist](#firebase-removal-checklist)
9. [Migration phases](#migration-phases)
10. [Callable structure example](#callable-structure-example)
11. [Package scripts](#package-scripts)

---

## Current state

| Area | Today |
|------|--------|
| Runtime | SQLite + Express only — Firebase is **dead code** (`USE_SQLITE = true`) |
| Frontend | `Patient-managment/` SPA → `/api/*` via `apiClient.js` |
| Gaps | No rate limiting, no structured logger, mixed backend layout, no live refresh after mutations |

---

## Target architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend SPA (frontend/)                   │
│  Pages → api/client → core/eventBus ← core/liveSync (SSE)   │
│  auth/session handles login, logout, 401                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST JSON  /api/v1/*
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend Express (backend/)                 │
│  Middleware: logger → rateLimit → auth → validate            │
│  routes/v1 → controllers → services → repositories → SQLite │
│  lib/eventBus → SSE /api/v1/events/stream                    │
└─────────────────────────────────────────────────────────────┘
```

### Principles

- **API-only:** Frontend never touches the database.
- **Thin controllers, fat services:** HTTP → controller → service → repository.
- **Uniform responses:** Same JSON envelope on every endpoint.
- **Events for refresh:** Backend broadcasts changes; frontend invalidates and re-fetches.

---

## Proposed folder structure

```
dramin-pms/
├── package.json
├── .env.example
├── README.md
├── RESTRUCTURE_PLAN.md          ← this file
│
├── backend/
│   ├── server.js                # entry: init DB, listen
│   ├── app.js                   # express factory (testable)
│   └── src/
│       ├── config/
│       │   ├── env.js
│       │   └── database.js
│       ├── middleware/
│       │   ├── requestLogger.js
│       │   ├── rateLimiter.js
│       │   ├── auth.js
│       │   ├── clinicalAccess.js
│       │   ├── validate.js
│       │   └── errorHandler.js
│       ├── routes/v1/
│       │   ├── index.js
│       │   ├── auth.routes.js
│       │   ├── patients.routes.js
│       │   ├── appointments.routes.js
│       │   ├── clinical.routes.js
│       │   ├── billing.routes.js
│       │   ├── staff.routes.js
│       │   ├── alerts.routes.js
│       │   └── events.routes.js     # SSE stream
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── lib/
│       │   ├── logger.js
│       │   ├── apiResponse.js
│       │   └── eventBus.js
│       └── utils/
│
├── frontend/                    # rename from Patient-managment
│   ├── index.html
│   └── src/
│       ├── main.js
│       ├── api/
│       │   ├── client.js
│       │   ├── endpoints.js
│       │   └── errors.js
│       ├── auth/
│       │   ├── session.js
│       │   └── guards.js
│       ├── core/
│       │   ├── router.js
│       │   ├── eventBus.js
│       │   ├── liveSync.js
│       │   └── store.js
│       ├── features/
│       │   ├── patients/
│       │   ├── appointments/
│       │   ├── billing/
│       │   ├── clinical/
│       │   └── dashboard/
│       ├── pages/
│       ├── components/
│       ├── styles/
│       └── config/
│           ├── api.js           # API_BASE = '/api/v1'
│           └── branding.js
│
├── data/                        # gitignored runtime data
│   ├── patientsdata.db
│   ├── backups/
│   └── uploads/
│
├── scripts/
│   ├── backup-database.js
│   └── repair-database.js
│
└── electron/
```

### Why this scales

- New features = new `feature/` + `service/` + `repository/` + route file.
- API v2 later without breaking v1.
- Repositories isolate SQL → swap SQLite for Postgres without touching controllers.
- `eventBus` + SSE can later use Redis pub/sub for multiple server instances.

---

## API response contract

### Success

```json
{
  "success": true,
  "data": { },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-06-19T12:00:00.000Z"
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Double booking: Dr. Ahmed already has an appointment at 10:00"
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

### List (paginated)

```json
{
  "success": true,
  "data": [ ],
  "meta": {
    "total": 120,
    "page": 1,
    "pageSize": 20,
    "requestId": "uuid"
  }
}
```

### Frontend client behaviour

| Status | Action |
|--------|--------|
| `200` / `201` | Parse `data`, emit `data:changed` if mutation |
| `401` | Clear token, close SSE, redirect to login |
| `409` | Show `error.message` (e.g. double booking) |
| `429` | Show "Too many requests, try again later" |

---

## Rate limiter

Use `express-rate-limit`.

| Route group | Limit |
|-------------|-------|
| `POST /api/v1/auth/login` | 10 requests / 15 min per IP |
| `POST /api/v1/auth/*` | 20 / 15 min per IP |
| All `/api/v1/*` | 300 / 15 min per IP (or per user when authenticated) |
| `POST /api/v1/admin/backup` | 5 / hour |

Returns HTTP `429` with envelope `{ "code": "RATE_LIMITED", ... }`.

---

## Logger

Use **Pino** (structured JSON logs).

| Layer | Logged |
|-------|--------|
| HTTP | method, path, status, duration, requestId, userId |
| Service | business actions (assignment, invoice, etc.) |
| Error | stack in dev; message + code in prod |

Keep existing **`audit_log` table** for clinic compliance. Logger = ops/debug; audit = accountability.

### Environment variables

```env
PORT=3000
JWT_SECRET=change-me-in-production
LOG_LEVEL=info
RATE_LIMIT_MAX=300
NODE_ENV=development
```

---

## Auto-reload / live sync

### Layer 1 — Client event bus (immediate)

After every successful `POST` / `PUT` / `PATCH` / `DELETE` in `api/client.js`:

```js
eventBus.emit('data:changed', { entity: 'patients', action: 'update', id });
```

Active pages subscribe and call `loadData()` again.

### Layer 2 — SSE (multi-tab / multi-user)

```
GET /api/v1/events/stream
Authorization: Bearer <token>
```

Server pushes:

```json
{ "type": "patient.updated", "id": "12", "by": "userId" }
{ "type": "appointment.created", "id": "45" }
{ "type": "assignment_expired", "patientId": "3" }
```

Services publish on mutation:

```js
eventBus.publish('patient.updated', { id, userId: req.user.id });
```

### Layer 3 — Auth lifecycle

| Event | Frontend action |
|-------|-----------------|
| User clicks logout | Clear token, close SSE, show login |
| API returns 401 | Same + toast "Session expired" |
| Login success | Open SSE, load app shell |
| Clinic alert created | Refresh bell badge |

### What refreshes automatically

- Current page (patients, appointments, billing, etc.)
- Sidebar badges (recalls, clinic alerts)
- User display if profile changes

---

## Firebase removal checklist

### Delete entirely

```
functions/
Patient-managment/src/services/firebase.js
Patient-managment/src/firebase-config.js
Patient-managment/src/firebase-config.example.js
scripts/migrate-sqlite-to-firestore.js
FIREBASE_SETUP.md
```

### Simplify (remove Firebase branches)

| File | Change |
|------|--------|
| `authService.js` → `auth/session.js` | JWT/SQLite only |
| `login.js` | Remove Firebase setup screen |
| `app.js` → `main.js` | Remove `USE_SQLITE`, `isFirebaseConfigured` |
| `config/backend.js` → `config/api.js` | `API_BASE = '/api/v1'` only |
| `package.json` | Remove `firebase:*`, `migrate:firestore` scripts |
| `.gitignore` | Remove `.firebase/`, `serviceAccountKey.json` |
| `README.md`, `SQLITE_SETUP.md` | Remove Firebase sections |

### Verify clean

```bash
rg -i "firebase|firestore|USE_SQLITE" --glob "!node_modules"
```

Expected: **zero matches** after cleanup.

---

## Migration phases

### Phase 1 — Foundation (1–2 days)

- [x] Add Pino logger + `requestLogger` middleware
- [x] Add `errorHandler` + `apiResponse` envelope
- [x] Add rate limiter on auth + global API
- [x] Update `apiClient.js` to parse envelope + handle 401 globally

### Phase 2 — Firebase removal (0.5 day)

- [x] Delete Firebase files and `functions/`
- [x] Strip dead code from auth, login, bootstrap
- [x] Update docs and `package.json`

### Phase 3 — Folder restructure (2–3 days)

- [x] Move backend into `backend/`
- [x] Merge `PatientController/Model/Service` → controllers + services + repositories
- [x] Rename `Patient-managment/` → `frontend/`
- [x] Mount API at `/api/v1`
- [x] Update `package.json` start script

### Phase 4 — Live sync (1 day)

- [x] Backend `eventBus` + SSE `events.routes.js`
- [x] Frontend `liveSync.js` + page subscriptions
- [x] Publish events on patient CRUD, appointments, billing

### Phase 5 — Polish (1 day)

- [x] Request validation (zod) on POST bodies
- [x] Integration tests (auth, patients, rate limit)
- [x] `.env.example` documented

**Estimated total:** 5–7 focused days.

---

## Callable structure example

### Backend flow

```
POST /api/v1/appointments/assign
  → appointments.routes.js
  → appointments.controller.assign(req, res)
  → appointments.service.assignDoctor(patientId, options)
  → scheduleSlots.findBestSlot()
  → appointments.repository.insert()
  → patients.repository.updateAssignment()
  → assignmentAlerts.create()
  → eventBus.publish('appointment.created', { id })
  → res.json(apiResponse.success(data))
```

### Frontend flow

```
appointmentApi.assign(patientId)
  → api/client.post('/appointments/assign', body)
  → on success: eventBus.emit('data:changed', { entity: 'appointments' })
  → appointments page listener → loadAppointments()
```

---

## Package scripts

After restructure:

```json
{
  "scripts": {
    "start": "node backend/server.js",
    "dev": "nodemon backend/server.js",
    "backup": "node scripts/backup-database.js",
    "test": "node --test backend/tests"
  }
}
```

---

## What stays the same

- SQLite schema and existing features (doctor assignment, billing, clinical access)
- JWT auth (`/auth/login`, `/auth/me`)
- Hash-based SPA routing
- Electron desktop wrapper (point at `backend/server.js`)
- Clinic branding and role model (admin, dentist, receptionist)

---

## Recommended approach

**Incremental migration** (recommended):

1. Ship Phase 1 + 2 first (logger, rate limit, Firebase removal) — app stays runnable.
2. Phase 3 folder move in a second pass.
3. Phase 4 + 5 for live sync and polish.

This avoids a single large breaking change.

---

## Status

All five migration phases are **complete**. The app runs as a local SQLite + Express stack with `frontend/` and `backend/` folders.

## Next steps (optional polish)

- Expand Zod validation to clinical, staff, and procedure routes
- Add E2E / Playwright tests for the SPA
- Build Electron installers with `electron-builder` if desktop distribution is needed

---

*Dr Amin Specialty Dental Clinic PMS — Architecture plan*
