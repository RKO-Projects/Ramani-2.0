# Ramani Backend — Implementation Status & Roadmap

This document tracks what is implemented in the Ramani 2.0 backend against the overall architecture roadmap, what has been completed in recent sprints (P0, P1, P2), and what remains to be built (P3, P4).

Use it alongside [`TEAM_SYNC.md`](../TEAM_SYNC.md) when reviewing PRs, planning sprints, or onboarding team members.

---

## Status at a glance

| Phase | Roadmap goal | Current status |
| --- | --- | --- |
| **0. Configuration & Secret Wiring** | Enforce planner API keys, secret fallbacks, sandbox/prod SMS URLs | **Completed** |
| **1. Session & Reliability** | Redis setex upgrade, E.164 phone normalization, exponential backoff, dead-letter queue | **Completed** |
| **2. Real Map & Risk Data** | WKT geometry columns, Alembic migration 002, live OSM client, live GHACOF client | **Completed** |
| **3. Operations & Security** | RBAC roles, Prometheus metrics, rate limiting middleware, CI pipeline | **In Progress / Next** |
| **4. Advanced Intelligence** | Satellite layers, change detection stubs, second settlement validation | **Future Phase** |

**46 backend tests pass.** Full test execution command:
```bash
.venv/bin/pytest -v
```

---

## What is implemented and validated

### Priority 0: Configuration & Secrets
- `app/config.py` uses `Pydantic` `AliasChoices` for `RAMANI_` variable fallbacks.
- Dynamic Africa's Talking API URL resolution (`is_sandbox`, `is_production`).
- SMS adapter uses `structlog` and validates missing credentials gracefully.
- `apps/planner/lib/api.ts` configured with `X-API-Key` headers.
- Comprehensive `.env.example` blueprint at repository root.
- Fixed Python 3.14 PyO3 compilation using `PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1`.

### Priority 1: Session Management & Worker Reliability
- `app/infrastructure/redis_client.py` uses non-deprecated `redis.set(..., ex=ttl)`.
- USSD entry points in `app/routers/ussd.py` enforce E.164 phone normalization (`+2547...`).
- `OutboxRepository.pending()` implements exponential backoff ($2^{\text{attempts}}$ minutes, max 24h).
- Added `OutboxRepository.dead_letter()` for 5+ failed attempts monitoring.
- Background worker `app/workers/runner.py` instrumented with `structlog`.

### Priority 2: Real Geospatial Data & Ingestion
- `LandmarkORM` and `GraphEdgeORM` upgraded with `provenance` and `geom_wkt` (WKT Point & LineString) columns.
- Alembic migration `002_geospatial_upgrade.py` created using SQLite-compatible `batch_alter_table`.
- Implemented `app/infrastructure/ingestion/osm_client.py` for fetching live Kibera nodes/ways from Overpass API with haversine distance calculation and 5x flood multipliers.
- Implemented `app/infrastructure/ingestion/ghacof_client.py` for fetching live ICPAC seasonal climate outlooks with offline seed fallback.
- Wired live GHACOF ingestion into `POST /api/v1/admin/ingest/ghacof`.
- 25 new tests added in `tests/test_geospatial_p2.py` (total 46 passing tests).

---

## What to add next (Priority 3 & Beyond)

### P3 — Operations & Security (Current Sprint)

| Item | Purpose | Implementation approach |
| --- | --- | --- |
| **Role-Based Access Control (RBAC)** | Restrict administrative endpoints | Add `require_role("admin")`, `require_role("planner")` dependencies in `app/deps.py` |
| **Prometheus Metrics** | Visibility into SOS volume and route latency | Create `app/infrastructure/metrics.py` exporting counters and histograms |
| **Rate Limiting** | Prevent endpoint abuse | Add token-bucket rate limiter middleware (`app/middleware/rate_limit.py`) |
| **CI Pipeline** | Automate test verification on PRs | Create `.github/workflows/backend-ci.yml` running `pytest` & `alembic check` |

### P4 — Advanced Intelligence (Future)

- **Satellite Change Detection**: Integrate Sentinel-2 cloud-free scene comparison.
- **Drain Gauges / Sensors**: Ingest real-time water level sensor data via MQTT/HTTP.
- **Mathare Field Validation**: Expand second settlement landmarks and safe havens with local partners.

---

## Guidelines to prevent clashes

1. **Do not modify past migrations**: Always add new Alembic migration scripts in `alembic/versions/`.
2. **Preserve Pydantic schema contracts**: Do not remove or break existing response fields in `app/schemas.py`.
3. **Run tests before pushing**: Ensure `.venv/bin/pytest -v` passes cleanly.
