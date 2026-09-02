# Ramani Backend

Ramani's backend is a FastAPI service for climate preparedness and emergency
response in informal urban settlements. The current data is seeded for Kibera.

It powers two clients:

- The **community gateway**: PWA and USSD flows for SOS, evacuation routes,
  hazard reports, and local alerts.
- The **planner dashboard**: vulnerability priorities, emergency events, and
  early damage reports for disaster-response teams.

This document explains the backend as it exists today. It also identifies
known limitations and design questions where contributor feedback is welcome.

## Problem the backend solves

Conventional maps and navigation systems often do not represent informal
alleys, drains, footbridges, or locally known landmarks. Regional climate
outlooks also do not directly tell response teams which settlement zones need
attention first.

Ramani connects these missing layers:

1. It converts local risk factors and a seasonal rainfall outlook into an
   auditable Climate Vulnerability Index (CVI).
2. It models evacuation paths as a landmark graph rather than relying on
   street names or turn-by-turn GPS.
3. It accepts live hazard reports and raises the cost of unsafe graph edges.
4. It exposes the same emergency functions through HTTP and USSD, allowing
   residents without mobile data to participate.

Ramani's CVI is a **planning index**, not a flood nowcast. Its routes are
conservative guidance and are not a replacement for instructions from local
emergency responders.

## Current architecture

The backend is currently a small modular FastAPI application:

```text
Community PWA ───────────────┐
                             │
Planner dashboard ───────────┼──> FastAPI routers
                             │        │
Africa's Talking USSD ───────┘        v
                                  Services
                          ┌──────────┼──────────┐
                          v          v          v
                         CVI      Routing     USSD
                          │          │          │
                          └──────> Store <──────┘
                                     │
                              Seed JSON + memory
```

The service is a good fit for a modular monolith at its present size. Separate
microservices would add deployment and consistency costs without solving a
current scaling problem.

## Repository structure

```text
backend/
├── app/
│   ├── main.py                 FastAPI application and router registration
│   ├── config.py               Environment-based application settings
│   ├── schemas.py              Pydantic request and response contracts
│   ├── routers/
│   │   ├── health.py           Liveness endpoint
│   │   ├── cvi.py              CVI, map layers, and alert endpoints
│   │   ├── routing.py          Landmark and evacuation-route endpoints
│   │   ├── incidents.py        SOS, hazard, and damage endpoints
│   │   └── ussd.py             Africa's Talking callback endpoint
│   ├── services/
│   │   ├── cvi.py              Risk scoring and alert copy
│   │   ├── routing.py          Graph loading, hazard weights, and Dijkstra
│   │   ├── store.py            Current in-memory event storage
│   │   └── ussd.py             USSD menus and session flow
│   └── data/
│       ├── kibera_cvi.json     Seed risk factors and seasonal outlook
│       ├── kibera_graph.json   Seed landmark graph and edge weights
│       └── kibera_landmarks.json
├── tests/
│   └── test_engine.py          API and core-flow tests
├── requirements.txt
└── pytest.ini
```

## Main application flow

`app/main.py` creates the FastAPI application, configures CORS, and registers
all routers under one process.

```text
Request
  -> router validates input with a Pydantic schema
  -> service applies domain logic
  -> service reads seed data or in-memory state
  -> router serializes the typed response
```

The routers should remain thin. Business decisions belong in services so they
can be tested without HTTP and reused by both the PWA and USSD interfaces.

## Climate Vulnerability Index flow

Endpoints:

- `GET /api/v1/cvi` returns zones using the default weights.
- `POST /api/v1/cvi` accepts alternative weights.
- `GET /api/v1/cvi/layers` lists planner layer metadata.
- `GET /api/v1/alerts` returns local seasonal alert text.

The current formula is:

```text
CVI =
    0.30 × drainage_proximity
  + 0.25 × structural_density
  + 0.25 × elevation_slope
  + 0.20 × ghacof_rainfall
```

`services/cvi.py` reads the seed observations, computes a score from 0 to 1,
assigns a priority, and returns zones from highest to lowest risk.

```text
score >= 0.75  -> critical
score >= 0.60  -> high
score >= 0.40  -> moderate
otherwise      -> low
```

The weights are intentionally transparent and can be challenged or changed by
planners. The GHACOF value is a seasonal factor, not real-time rainfall.

## Evacuation routing flow

Endpoints:

- `GET /api/v1/landmarks` returns known landmarks and safe havens.
- `POST /api/v1/routes` computes a route from one landmark to a requested or
  automatically selected safe haven.

The route service:

1. Loads landmarks from `kibera_landmarks.json`.
2. Loads graph edges from `kibera_graph.json`.
3. Applies current hazard penalties to edge weights.
4. Uses Dijkstra's algorithm to find a lower-cost path.
5. Converts node IDs into landmark names and short USSD-safe text.
6. Adds a safety disclaimer.

If no destination is supplied, the service chooses a known safe haven. The
current safe havens are Highridge Road and Community Center.

### How hazard reports change a route

`POST /api/v1/hazards` records a report and calls `apply_hazard()`:

- Rising water multiplies the reported edge cost by `8`.
- Other supported hazards multiply it by `5`.
- A penalized flood-prone edge receives an additional `1.5` multiplier.

The next route request is therefore more likely to avoid the reported edge.

Example:

```text
Resident reports rising water:
Line Saba <-> Main Drain Alley

Edge cost increases
  -> route graph is recalculated
  -> next route prefers a safer alternative
  -> response tells the resident which landmark corridor to avoid
```

These penalties currently live in process memory and do not survive a restart.

## Incident flow

Endpoints:

- `POST /api/v1/sos` creates an emergency event.
- `GET /api/v1/sos` supplies the planner emergency feed.
- `POST /api/v1/hazards` creates a hazard and modifies routing cost.
- `GET /api/v1/hazards` returns reported hazards.
- `GET /api/v1/damage` returns early loss-and-damage reports.

An SOS stores:

- Emergency type: flood/trapped, collapse/fire, or medical
- Nearest landmark when known
- Optional note and phone number
- Source: PWA or USSD
- Timestamp and response status

A hazard report creates both a hazard event and an unverified damage report.
This provides an immediate first picture of damage while leaving room for a
later verification process.

All events are currently stored in lists in `services/store.py`. They disappear
when the API process restarts and are not shared between multiple workers.

## USSD flow

Endpoint:

- `POST /api/v1/ussd` accepts Africa's Talking form-encoded callbacks.

Main menu:

```text
Ramani Safety Gateway
1. Emergency SOS
2. Evacuation route
3. Report hazard
4. Alert status
```

Africa's Talking sends:

- `sessionId`
- `phoneNumber`
- `text`

`services/ussd.py` parses the `*`-separated menu history and returns:

- `CON ...` when another user response is required.
- `END ...` when the session is complete.

The USSD and PWA paths call the same routing, CVI, and incident services. This
is important: the feature-phone interface is not a separate or reduced backend.

Current USSD sessions are held in a process-level dictionary. Redis with a
short TTL is the intended production replacement.

## HTTP API summary

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service liveness |
| `GET` | `/api/v1/cvi` | Default CVI ranking |
| `POST` | `/api/v1/cvi` | CVI with supplied weights |
| `GET` | `/api/v1/cvi/layers` | Available planner layers |
| `GET` | `/api/v1/alerts` | Current local alert text |
| `GET` | `/api/v1/landmarks` | Landmarks and safe havens |
| `POST` | `/api/v1/routes` | Landmark evacuation route |
| `POST` | `/api/v1/sos` | Create SOS event |
| `GET` | `/api/v1/sos` | Planner SOS feed |
| `POST` | `/api/v1/hazards` | Report hazard and penalize edge |
| `GET` | `/api/v1/hazards` | Hazard feed |
| `GET` | `/api/v1/damage` | Early damage reports |
| `POST` | `/api/v1/ussd` | Africa's Talking callback |

Interactive OpenAPI documentation is available at `/docs` while the API is
running.

## Local development

Requirements:

- Python 3.11 or newer
- A virtual environment is recommended

From the `backend` directory:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Check the API:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"status":"ok","service":"ramani"}
```

Environment variables use the `RAMANI_` prefix:

```bash
RAMANI_ENV=development
RAMANI_CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

The root `.env.example` also documents planned Africa's Talking and Mapbox
configuration. Those provider values are not currently read by the FastAPI
settings class.

## Tests

Run from the `backend` directory:

```bash
pytest
```

The current suite checks:

- Health endpoint availability
- CVI ordering and Line Saba's seeded priority
- Route generation to a safe haven
- USSD menu and alert responses
- Hazard-driven graph reweighting

When contributing, add tests for new domain behavior and for error cases. Avoid
tests that depend on a live external provider.

## Current limitations

This repository is a working prototype, not a production emergency system.

- Incidents, hazard penalties, and USSD sessions are in memory.
- CVI, landmarks, and graph edges come from static JSON seed files.
- The graph contains only a small set of Kibera landmarks.
- Hazard penalties do not expire and reports are not yet verified.
- The nearest-safe-haven choice currently compares path length by node count,
  while the final route itself uses weighted cost.
- There is no planner authentication or role-based access.
- There is no request signing for the Africa's Talking callback.
- SMS confirmation is described in the user flow but not implemented.
- There is no idempotency protection for provider retries or repeated SOS
  submissions.
- There are no database migrations, background jobs, metrics, or audit log.

Do not present the current CVI as machine learning or hydrological prediction.
Do not use the routing response as guaranteed real-time safety information.

## Recommended implementation order

### 1. Durable operational core

This should be the first production-oriented backend change.

- Add PostgreSQL/PostGIS, SQLAlchemy, and Alembic.
- Add repositories for SOS, hazards, damage, landmarks, and graph penalties.
- Persist hazard severity, report source, verification, and expiration.
- Add idempotency keys and incident status transitions.
- Preserve current API response contracts during the migration.

Definition of done: create an SOS and hazard, restart the API, and prove that
the event, route penalty, and changed route remain available.

### 2. Routing safety

- Select the nearest safe haven using total weighted route cost.
- Expire temporary community hazard penalties.
- Include graph version, hazard evidence, and computation time in route data.
- Test disconnected paths, simultaneous hazards, stale data, and conflicts.
- Fail safely when no trustworthy route is available.

### 3. Production USSD and notifications

- Store sessions in Redis with a short TTL.
- Verify provider callbacks and normalize phone numbers.
- Use a transactional outbox for SMS and responder notifications.
- Add retries without generating duplicate incidents.
- Redact phone numbers and precise location data from application logs.

### 4. Versioned geospatial and climate ingestion

- Move landmarks, edges, safe havens, and settlement boundaries to PostGIS.
- Import community traces from Map Kibera/OSM with provenance.
- Add versioned GHACOF outlook ingestion.
- Record data timestamp, source, geometry version, and confidence with scores.
- Require review before reports permanently alter the canonical graph.

### 5. Operations and security

- Authenticate planner endpoints and add responder/admin roles.
- Add structured logs, correlation IDs, metrics, readiness checks, and audits.
- Define backup, retention, and disaster-recovery policies.
- Containerize the API, worker, Redis, and PostgreSQL/PostGIS.
- Load-test incident intake and the USSD callback.

### Last: advanced intelligence

Satellite-derived layers, automated damage detection, drain sensors, and
predictive models should come last. They require reliable, versioned ground
truth from the earlier operational phases. Validate the flow in Kibera before
making settlement configuration data-driven and expanding to Mathare.

## Design questions for contributors

Suggestions and pull requests are especially welcome around these questions:

1. What report-verification and expiry policy best balances immediate safety
   with protection from false hazard reports?
2. Should routing penalties be stored as event-derived values or materialized
   edge state?
3. Which graph versioning strategy lets active emergency routes remain
   explainable after map updates?
4. How should planner authentication work without adding friction to public
   emergency submissions?
5. Which personal data is truly necessary for dispatch, and how quickly should
   it be deleted?
6. What local partners should validate safe havens, landmark names, and route
   narration before a field pilot?

When suggesting a change, please include:

- The failure mode or user need it addresses
- Whether it affects residents, responders, or both
- Safety and privacy implications
- Required schema or API changes
- A migration and rollback approach
- Tests that demonstrate the intended behavior

## Safety principles

- Prefer higher ground and verified safe havens.
- Treat community hazards as immediate temporary safety signals, not permanent
  map truth.
- Keep a human responder in the loop.
- Keep route language short, local, and landmark-based.
- Fail closed when route evidence is stale or incomplete.
- Treat phone numbers and locations as sensitive information.
- Keep all risk calculations auditable and versioned.

