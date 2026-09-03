from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.infrastructure.database import SessionLocal, init_db
from app.infrastructure.ingestion.pipeline import ingest_map_traces, register_satellite_layer_stub
from app.infrastructure.repositories.geospatial import GeospatialRepository
from app.middleware.logging import RequestLoggingMiddleware, configure_logging
from app.routers import admin, cvi, health, incidents, routing, ussd, whatsapp

logger = structlog.get_logger("ramani.startup")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging()
    init_db()
    db = SessionLocal()
    try:
        geo = GeospatialRepository(db, settings.default_settlement)
        geo.seed_from_json_if_empty()
        geo.seed_mathare()
        ingest_map_traces(db, settings.default_settlement)
        register_satellite_layer_stub(
            db,
            settlement_id=settings.default_settlement,
            layer_type="change_detection",
            source="sentinel-2-stub",
            confidence=0.0,
        )
        db.commit()
        logger.info("startup_complete", settlement=settings.default_settlement)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Ramani",
    description="Climate resilience engine for informal urban settlements.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(cvi.router)
app.include_router(routing.router)
app.include_router(incidents.router)
app.include_router(ussd.router)
app.include_router(whatsapp.router)
app.include_router(admin.router)
