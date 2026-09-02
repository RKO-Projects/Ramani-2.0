from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.config import settings
from app.deps import db_session, require_planner_key
from app.infrastructure.ingestion.pipeline import ingest_ghacof, ingest_map_traces
from app.infrastructure.models import IngestionRunORM, SatelliteLayerORM, SettlementORM
from app.infrastructure.repositories.geospatial import GeospatialRepository
from app.schemas import IngestionStatus, SatelliteLayerStatus, SettlementInfo

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/settlements", response_model=list[SettlementInfo])
def list_settlements(
    db: Session = Depends(db_session),
    _actor: str = Depends(require_planner_key),
) -> list[SettlementInfo]:
    rows = db.scalars(select(SettlementORM)).all()
    return [SettlementInfo(id=row.id, name=row.name, active=row.active) for row in rows]


@router.post("/ingest/map", response_model=IngestionStatus)
def trigger_map_ingest(
    settlement_id: str = settings.default_settlement,
    db: Session = Depends(db_session),
    _actor: str = Depends(require_planner_key),
) -> IngestionStatus:
    row = ingest_map_traces(db, settlement_id)
    return IngestionStatus(
        source=row.source,
        settlement_id=row.settlement_id,
        records=row.records,
        geometry_version=row.geometry_version,
        confidence=row.confidence,
        finished_at=row.finished_at,
    )


@router.post("/ingest/ghacof", response_model=IngestionStatus)
def trigger_ghacof_ingest(
    settlement_id: str = settings.default_settlement,
    db: Session = Depends(db_session),
    _actor: str = Depends(require_planner_key),
) -> IngestionStatus:
    row = ingest_ghacof(db, settlement_id)
    return IngestionStatus(
        source=row.source,
        settlement_id=row.settlement_id,
        records=row.records,
        geometry_version=row.geometry_version,
        confidence=row.confidence,
        finished_at=row.finished_at,
    )


@router.get("/ingest/runs", response_model=list[IngestionStatus])
def list_ingestion_runs(
    db: Session = Depends(db_session),
    _actor: str = Depends(require_planner_key),
) -> list[IngestionStatus]:
    rows = db.scalars(select(IngestionRunORM).order_by(desc(IngestionRunORM.finished_at))).all()
    return [
        IngestionStatus(
            source=row.source,
            settlement_id=row.settlement_id,
            records=row.records,
            geometry_version=row.geometry_version,
            confidence=row.confidence,
            finished_at=row.finished_at,
        )
        for row in rows
    ]


@router.get("/satellite/layers", response_model=list[SatelliteLayerStatus])
def list_satellite_layers(
    db: Session = Depends(db_session),
    _actor: str = Depends(require_planner_key),
) -> list[SatelliteLayerStatus]:
    rows = db.scalars(select(SatelliteLayerORM)).all()
    return [
        SatelliteLayerStatus(
            settlement_id=row.settlement_id,
            layer_type=row.layer_type,
            source=row.source,
            confidence=row.confidence,
            active=row.active,
            captured_at=row.captured_at,
        )
        for row in rows
    ]


@router.post("/settlements/mathare/bootstrap")
def bootstrap_mathare(
    db: Session = Depends(db_session),
    _actor: str = Depends(require_planner_key),
) -> dict:
    repo = GeospatialRepository(db, "mathare")
    count = repo.seed_mathare()
    db.commit()
    return {"settlement": "mathare", "landmarks_seeded": count}
