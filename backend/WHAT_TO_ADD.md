# Ramani Backend — What Should Be Added

This document compares the current backend against the [architecture roadmap](/Users/app/.cursor/plans/backend_architecture_roadmap_d58467f7.plan.md) and lists what is done, what is partial, and what contributors should add next.

Use it when reviewing PRs, planning sprints, or onboarding a new backend developer.

---

## Status at a glance

| Phase | Roadmap goal | Current status |
| --- | --- | --- |
| 1. Durable operational core | PostgreSQL, repositories, idempotency, pagination | **Done** (SQLite default; Postgres via Docker) |
| 2. Routing safety | Weighted safe haven, penalties with expiry, route metadata | **Done** |
| 3. Production USSD & notifications | Redis sessions, outbox, SMS, webhook verify | **Partial** |
| 4. Real map & risk data | PostGIS, live Map Kibera/OSM, GHACOF ingest | **Partial** |
| 5. Operations & security | Auth roles, metrics, backups, load testing | **Partial** |
| 6. Advanced intelligence | Satellite layers, change detection, second settlement | **Stub only** |

**17 backend tests pass.** The core closed loop works: SOS → hazard penalty → changed route → planner feed.

---

## What is already implemented

These items match the roadmap and do not need to be rebuilt:

- SQLAlchemy models and Alembic migration (`001_initial_schema`)
- Repositories for SOS, hazards, damage, edge penalties, outbox, geospatial data
- Idempotency keys on `POST /api/v1/sos` and `POST /api/v1/hazards`
- Paginated planner reads: `GET /api/v1/sos`, `/hazards`, `/damage`
- SOS status transitions: `open` → `acknowledged` → `resolved` via `PATCH /api/v1/sos/{id}`
- Domain routing split: `graph`, `penalties`, `safe_haven`, `narrator`, `service`
- Weighted safe-haven selection (not node count)
- Route metadata: `graph_version`, `hazard_evidence`, `route_cost`, `computed_at`
- Hazard penalties stored in DB with TTL; worker expires stale penalties
- Redis/fake-redis USSD sessions
- Transactional SMS outbox + worker runner
- Admin ingestion endpoints and Mathare bootstrap stub
- Docker Compose (PostGIS, Redis, API, worker)
- Structured logging with correlation IDs
- `/health` and `/ready` endpoints

See [`backend/README.md`](README.md) for flow documentation and API reference.

---

## What should be added next (priority order)

### P0 — Required before any live pilot

These block a real shortcode or county deployment.

| Item | Why it matters | Suggested approach |
| --- | --- | --- |
| **Enforce planner auth in production** | SOS/hazard feeds are sensitive | Set `RAMANI_PLANNER_API_KEY`; pass `X-API-Key` from planner app |
| **Enforce USSD webhook signing** | Prevent spoofed emergency callbacks | Set `RAMANI_USSD_WEBHOOK_SECRET`; configure Africa's Talking to send signature |
| **Wire live SMS** | SOS flow promises "SMS confirm follows" | Set `RAMANI_SMS_ENABLED=true`, Africa's Talking credentials; run worker on a schedule |
| **Run Alembic on deploy** | `create_all` is fine for dev; production needs controlled migrations | Add `alembic upgrade head` to Docker entrypoint or CI deploy step |
| **Phone number retention policy** | Privacy and compliance | Add TTL job to redact/delete `phone` on resolved SOS after N days |
| **End-to-end restart test** | Roadmap completion criterion | Document/script: create SOS + hazard → restart API → verify event, penalty, route |

### P1 — Production reliability

| Item | Why it matters | Suggested approach |
| --- | --- | --- |
| **Scheduled worker (cron/Celery/APScheduler)** | Outbox and penalty expiry only run when worker is invoked manually | Run `python -m app.workers.runner all` every 1–5 minutes |
| **Outbox retry backoff** | Failed SMS should retry without duplicates | Exponential backoff; mark `failed` only after max attempts (partially done) |
| **Rate limiting on public endpoints** | Abuse protection without blocking emergencies | Token bucket on `/hazards`; never rate-limit `/sos` or USSD |
| **Responder notification channel** | Planners need push, not just dashboard polling | Add outbox channel `responder_push` or webhook to Slack/SMS for open SOS |
| **Settlement selector on API** | Mathare exists but most endpoints default to Kibera | Accept `settlement_id` query param or header on routing/incidents |
| **Planner app auth header** | Backend now requires key when configured | Update `apps/planner/lib/api.ts` to send `X-API-Key` from env |

### P2 — Real geospatial data (Phase 4 gaps)

| Item | Why it matters | Suggested approach |
| --- | --- | --- |
| **PostGIS geometry columns** | Lat/lon floats are not enough for boundaries, drains, overlays | Add `geometry(Point)` on landmarks, `geometry(LineString)` on edges; migration + GeoAlchemy2 |
| **Live Map Kibera / OSM import** | Current ingest re-seeds JSON, not community traces | Build fetcher for Overpass API or Map Kibera export; write to `graph_edges` with provenance |
| **Live GHACOF ingest** | CVI rainfall factor is static JSON | Scheduled job pulling ICPAC/GHACOF bulletin; store outlook id and tercile per season |
| **Settlement boundaries table** | CVI grid needs spatial join | Add `settlement_boundaries` polygon table; zone ↔ boundary mapping |
| **Admin review workflow** | Unverified reports must not permanently alter canonical graph | Add `review_status` on hazards; only verified reports can promote to permanent edge flags |
| **Graph version bump on ingest** | Routes must cite which graph version they used | Increment `graph_version` on each approved map import; reject routes when version mismatches |

### P3 — Operations & observability (Phase 5 gaps)

| Item | Why it matters | Suggested approach |
| --- | --- | --- |
| **Role-based access** | Single API key is not enough for county + NGO + admin | Roles: `responder`, `planner`, `admin`; scope settlements per role |
| **Metrics (Prometheus/OpenTelemetry)** | No visibility into SOS volume, route latency, outbox backlog | Counters: `sos_created_total`, `routes_computed_seconds`, `outbox_pending` |
| **Distributed tracing** | Correlation ID exists but no trace export | OpenTelemetry span per request + outbox delivery |
| **Backup and restore runbook** | Postgres volume exists but no documented recovery | pg_dump schedule, restore test, RPO/RTO doc in `docs/ops/` |
| **Data retention automation** | Audit logs and incidents accumulate | Retention job: archive resolved SOS > 90 days; delete phone fields earlier |
| **CI pipeline** | Tests run locally only | GitHub Action: `pytest`, lint, `alembic check`, Docker build |
| **Load test in CI or nightly** | `scripts/load_test.py` exists but is manual | Run against staging; alert if p95 latency or error rate exceeds threshold |

### P4 — Advanced intelligence (Phase 6 — last)

Do not start these until P0–P2 are validated in the field.

| Item | Why it matters | Suggested approach |
| --- | --- | --- |
| **Sentinel-2 / NDVI layers** | Roof material and canopy for heat/flood CVI | Earth Engine or local GeoTIFF pipeline; store in `satellite_layers` with confidence |
| **Post-event change detection** | Satellite is slow for first 72h; this complements crowdsourced pins | Activate stub in `register_satellite_layer_stub`; compare pre/post flood scenes |
| **Drain sensors / gauges** | Event-scale hydrology the CVI cannot predict | MQTT or HTTP ingest; temporary edge weight override when sensor threshold crossed |
| **Predictive / ML models** | Only after labeled outcomes exist | Use resolved SOS + verified damage as training labels; never replace transparent CVI weights without audit trail |
| **Full Mathare rollout** | Prove architecture generalizes | Field-validate landmarks and safe havens with local partners before enabling USSD menus |

---

## Partial implementations to finish

These exist as scaffolding but are not complete.

### USSD & SMS (Phase 3)

| Done | Still missing |
| --- | --- |
| Redis session storage | Phone normalization on every USSD write path |
| Webhook signature helper | Africa's Talking-specific signature format (may differ from current HMAC) |
| Outbox table + worker | Scheduled worker deployment; dead-letter queue for failed SMS |
| Console SMS provider | Production Africa's Talking sandbox/live testing checklist |

### Ingestion (Phase 4)

| Done | Still missing |
| --- | --- |
| `POST /admin/ingest/map` | Actual OSM/Map Kibera HTTP fetch |
| `POST /admin/ingest/ghacof` | Live GHACOF API or bulletin parser |
| `ingestion_runs` audit table | Rollback on failed ingest; diff view of graph changes |
| Seed JSON bootstrap | Remove dependency on seed files once live ingest is trusted |

### Security (Phase 5)

| Done | Still missing |
| --- | --- |
| Optional `X-API-Key` for planner/admin | Role matrix; per-settlement authorization |
| Privacy redaction helper | Apply redaction in structured logs (currently imported but not wired everywhere) |
| Audit log on incident create | Audit log for status changes, ingest, and admin actions |

---

## Frontend & integration gaps

The backend changed in ways the apps may not fully use yet.

| App | What to add |
| --- | --- |
| **Planner** (`apps/planner`) | Send `X-API-Key`; show SOS status and acknowledge/resolve actions; Mapbox map wired to `/landmarks` and CVI layers |
| **Community PWA** (`apps/community`) | Show route metadata (`avoided`, `graph_version`); offline fallback copy; service worker for installable PWA |
| **USSD** | Live Africa's Talking shortcode `*384*55#` pointed at `/api/v1/ussd` |
| **`.env.example`** | Document all `RAMANI_*` vars; separate planner vs backend env files |

---

## Suggested file additions

When implementing the items above, these files will likely be needed:

```text
backend/
├── docs/
│   ├── ops/
│   │   ├── backup-restore.md
│   │   ├── deploy.md
│   │   └── incident-response.md
│   └── adr/
│       └── 001-penalty-expiry-policy.md
├── app/
│   ├── infrastructure/
│   │   ├── ingestion/
│   │   │   ├── osm_client.py          # P2: live OSM/Overpass fetch
│   │   │   └── ghacof_client.py       # P2: live outlook fetch
│   │   └── metrics.py                 # P3: Prometheus counters
│   └── middleware/
│       └── rate_limit.py              # P1: abuse protection
├── alembic/versions/
│   └── 002_postgis_geometry.py        # P2: geometry columns
├── scripts/
│   ├── e2e_restart_test.sh            # P0: persistence proof
│   └── seed_production.sh             # P0: controlled prod seed
└── .github/workflows/
    └── backend-ci.yml                 # P3: automated tests
```

---

## What not to add yet

Avoid these until the operational core is validated with local partners:

- Microservices split (keep the modular monolith)
- Black-box ML flood nowcasting marketed as real-time safety
- Permanent graph edits from unverified community reports
- GPS turn-by-turn routing (landmark text remains the interface)
- Satellite-only damage assessment replacing the first 72h crowdsourced pins

---

## Definition of done (field pilot)

The backend is ready for a controlled Kibera pilot when all of these are true:

1. SOS, hazard, and route penalty survive an API restart.
2. Live USSD shortcode works with signed callbacks and Redis sessions.
3. SMS confirmation delivers via Africa's Talking in sandbox and live.
4. Planner dashboard shows paginated SOS with acknowledge/resolve.
5. Hazard report changes the next route within one request.
6. Map and GHACOF data have a documented ingest source and version.
7. Planner auth, webhook signing, and phone retention are enforced.
8. Backup, worker schedule, and on-call runbook exist.

---

## How to suggest changes

When opening an issue or PR for any item above, include:

1. Which priority (P0–P4) and roadmap phase it belongs to
2. The failure mode or user need it addresses
3. Whether it affects residents, responders, or both
4. Safety and privacy implications
5. Schema or API changes required
6. Migration and rollback plan
7. Tests that prove the behavior

Questions welcome in issues or inline comments on [`backend/README.md`](README.md).
