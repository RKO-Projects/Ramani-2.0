# Ramani 2.0 — Team Sync & Development Guide

> **Last Updated:** September 2026  
> **Backend Build Status:** ✅ **46 / 46 Tests Passing** (`.venv/bin/pytest -v`)  
> **Current Version:** Phase 2 Complete (P0, P1, P2 Implemented)

This document provides a single source of truth for the **Backend** and **Frontend** teams. It details what has been completed, major architectural decisions, action items for team members, API contracts, and rules to prevent code/merge conflicts.

---

## 🚀 Accomplishments & Completed Roadmap Items

We have successfully completed **Priority 0 (Configuration & Secrets)**, **Priority 1 (Session & Reliability)**, and **Priority 2 (Geospatial & Live Ingestion)**.

### 1. Priority 0: Configuration & Secret Wiring (Completed)
- **Environment Variable Fallbacks**: Upgraded `app/config.py` using Pydantic `AliasChoices` so all settings resolve both `RAMANI_` prefixed keys (e.g. `RAMANI_DATABASE_URL`) and standard keys (e.g. `DATABASE_URL`).
- **Dynamic Africa's Talking Integration**: SMS provider dynamically resolves Sandbox (`https://api.sandbox.africastalking.com/...`) vs Production (`https://api.africastalking.com/...`) URLs based on environment status (`is_sandbox`, `is_production`).
- **Frontend Auth Integration**: Configured `apps/planner/lib/api.ts` to automatically inject `X-API-Key` headers into outgoing requests.
- **Environment Blueprint**: Created a comprehensive `.env.example` at the root documenting all backend, planner frontend, and secret keys.
- **Python 3.14 Environment Compatibility**: Solved PyO3 / Rust compilation restrictions on Python 3.14 using `PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1` and flexible requirements constraints.

### 2. Priority 1: USSD Sessions & Worker Reliability (Completed)
- **Redis Session Storage**: Refactored `app/infrastructure/redis_client.py` to use `redis.set(..., ex=ttl)` instead of deprecated `setex` methods, eliminating deprecation warnings.
- **E.164 Phone Normalization**: Integrated `normalize_phone` across all USSD entry points (`app/routers/ussd.py`), ensuring all SOS, hazard reports, and session records store clean E.164 phone formats (`+2547...`).
- **Outbox Exponential Backoff**: Enhanced `OutboxRepository.pending()` to skip recently failed messages using an exponential backoff schedule ($2^{\text{attempts}}$ minutes, capped at 24 hours).
- **Dead-Letter Queue Visibility**: Implemented `OutboxRepository.dead_letter()` to track permanently failed messages (5+ attempts).
- **Structured Worker Logging**: Integrated `structlog` into `app/workers/runner.py` for structured, correlation-friendly logging of outbox delivery and penalty expiry runs.

### 3. Priority 2: Real Geospatial Data & Ingestion (Completed)
- **Spatial Model Upgrade**: Updated `LandmarkORM` and `GraphEdgeORM` in `app/infrastructure/models.py` with `provenance` (e.g. `seed`, `osm`, `map-kibera`) and `geom_wkt` (WKT Point & LineString) columns.
- **Alembic Migration `002_geospatial_upgrade`**: Created migration using SQLite-compatible `batch_alter_table` for seamless zero-downtime database upgrades.
- **OSM / Overpass Ingestion Client**: Created `app/infrastructure/ingestion/osm_client.py` to fetch named nodes and walkable ways from Overpass API, calculating haversine edge weights and applying 5× flood-prone multipliers.
- **GHACOF / ICPAC Outlook Ingestion Client**: Created `app/infrastructure/ingestion/ghacof_client.py` to parse ICPAC seasonal rainfall bulletins (tercile probabilities, El Niño phase), with automated seed fallback for offline/resilient operation.
- **Live Ingestion Endpoint**: Updated `POST /api/v1/admin/ingest/ghacof` in `app/routers/admin.py` to fetch live ICPAC data and update CVI observations in real-time.
- **25 New Tests Added**: Created `tests/test_geospatial_p2.py`, bringing total test suite count to **46 passing tests**.

---

## 🛠️ Action Items & Responsibilities by Team

### ⚙️ Backend Team Action Items
1. **Executing Priority 3 (Operations & Security)**:
   - **Role-Based Access Control (RBAC)**: Extend dependency checking in `app/deps.py` for `responder`, `planner`, and `admin` roles.
   - **Prometheus Metrics**: Implement `app/infrastructure/metrics.py` exporting counters for `sos_created_total`, `routes_computed_seconds`, and `outbox_pending`.
   - **Rate Limiting**: Add token-bucket rate limiting middleware (`app/middleware/rate_limit.py`) to protect public endpoints without throttling USSD callback endpoints.
   - **CI Pipeline**: Add GitHub Actions workflow (`.github/workflows/backend-ci.yml`) running `pytest`, `alembic check`, and `ruff`.
2. **Testing & Execution Commands**:
   - Always run tests via the virtual environment binary:
     ```bash
     .venv/bin/pytest -v
     ```
   - If installing new backend dependencies on Python 3.14:
     ```bash
     PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 pip install -r requirements.txt
     ```
3. **Background Worker**:
   - In production, schedule the worker script to run periodically (e.g. via cron every 1 minute):
     ```bash
     python -m app.workers.runner all
     ```

---

### 🎨 Frontend Team Action Items (Planner & Community PWA)
1. **Planner App (`apps/planner`)**:
   - **API Authentication**: Ensure `NEXT_PUBLIC_PLANNER_API_KEY` is set in environment files (`.env.local`). `lib/api.ts` is pre-configured to send `X-API-Key`.
   - **Consuming Ingestion APIs**:
     - `POST /api/v1/admin/ingest/ghacof`: Trigger live ICPAC seasonal climate updates.
     - `GET /api/v1/admin/ingest/runs`: Fetch historic audit logs of data ingestion runs (displays confidence score, timestamp, source).
   - **Mapbox Spatial Layers**:
     - `LandmarkORM` records now include `geom_wkt` (WKT `POINT(lon lat)`) and `provenance`. Parse WKT to render vector markers on Mapbox GL maps.
   - **SOS Incident Management**:
     - Poll or listen to `GET /api/v1/sos` and trigger `PATCH /api/v1/sos/{id}` (`open` → `acknowledged` → `resolved`).
2. **Community PWA (`apps/community`) / USSD Integration**:
   - **USSD Webhook Target**: Point Africa's Talking callback URL to `POST /api/v1/ussd`.
   - **HMAC Verification**: When `RAMANI_USSD_WEBHOOK_SECRET` is configured in backend, set Africa's Talking to include the header `X-Ramani-Signature`.

---

## 🔒 Rules to Prevent Code & Schema Clashes

To ensure smooth collaboration and prevent breaking changes across the stack:

1. **Database Schema Rule**:
   - **NEVER** modify existing Alembic migration files (`001_initial_schema.py`, `002_geospatial_upgrade.py`).
   - If adding or changing ORM fields in `app/infrastructure/models.py`, always generate a new migration file in `alembic/versions/` (e.g. `003_your_feature.py`) using `batch_alter_table` for SQLite compatibility.

2. **API Contract Rule**:
   - Do **NOT** rename existing JSON fields in response Pydantic models in `app/schemas.py`.
   - If adding new fields, make them **optional** with default values to avoid breaking frontend TypeScript interfaces.

3. **Git & Branching Workflow**:
   - Do not push commits directly to `main`.
   - Use descriptive feature branches:
     - `feat/backend-p3-metrics`
     - `feat/frontend-cvi-heatmap`
     - `fix/ussd-timeout`
   - PRs must pass the 46 tests (`.venv/bin/pytest -v`) before merging.

4. **Environment Variables**:
   - Whenever you add a new environment variable in backend `app/config.py` or frontend `apps/planner`, immediately update `.env.example` at the root of the project with a documented placeholder.

---

## 📊 Summary of Key Endpoints

| Endpoint | Method | Auth Required | Purpose |
| --- | --- | --- | --- |
| `/api/v1/sos` | `POST` | Optional | Submit Emergency SOS from PWA/App |
| `/api/v1/sos` | `GET` | `X-API-Key` | List SOS incidents for Planner Dashboard |
| `/api/v1/sos/{id}` | `PATCH` | `X-API-Key` | Update SOS status (`acknowledged`, `resolved`) |
| `/api/v1/route` | `GET` / `POST` | Public | Compute hazard-avoiding evacuation route |
| `/api/v1/ussd` | `POST` | Signature (Optional) | Africa's Talking USSD Callback |
| `/api/v1/cvi/zones` | `GET` | Public | Get micro-vulnerability zone scores |
| `/api/v1/admin/ingest/ghacof` | `POST` | `X-API-Key` | Trigger live GHACOF climate outlook fetch |
| `/api/v1/admin/ingest/map` | `POST` | `X-API-Key` | Trigger OSM/Map Kibera geometry ingest |
| `/api/v1/admin/ingest/runs` | `GET` | `X-API-Key` | Fetch ingestion audit history |
