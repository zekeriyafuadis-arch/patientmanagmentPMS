# Backend configuration

Runtime paths and database setup live in [`database.js`](database.js).

- **Data directory:** `patientsData/` (override with `PMS_DATA_DIR`)
- **Database file:** `patientsdata.db` (override with `PMS_DB_PATH`)
- **Uploads:** `patientsData/xrays/` (override with `PMS_UPLOADS_DIR`)

The Express app is started via [`backend/server.js`](../../server.js) and serves the SPA from `frontend/`.
