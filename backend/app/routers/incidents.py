from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.deps import get_incident_service, require_planner_key
from app.domain.incidents import IncidentService
from app.schemas import (
    DamageReport,
    HazardCreate,
    HazardEvent,
    PaginatedDamage,
    PaginatedHazards,
    PaginatedSos,
    SosCreate,
    SosEvent,
    SosStatusUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["incidents"])


@router.post("/sos", response_model=SosEvent)
def create_sos(
    body: SosCreate,
    service: IncidentService = Depends(get_incident_service),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> SosEvent:
    return service.add_sos(idempotency_key=idempotency_key, **body.model_dump(exclude={"settlement_id"}))


@router.get("/sos", response_model=PaginatedSos)
def list_sos(
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    service: IncidentService = Depends(get_incident_service),
    _actor: str = Depends(require_planner_key),
) -> PaginatedSos:
    items, total = service.list_sos(status=status, limit=limit, offset=offset)
    return PaginatedSos(items=items, total=total, limit=limit, offset=offset)


@router.patch("/sos/{event_id}", response_model=SosEvent)
def update_sos_status(
    event_id: str,
    body: SosStatusUpdate,
    service: IncidentService = Depends(get_incident_service),
    actor: str = Depends(require_planner_key),
) -> SosEvent:
    event = service.update_sos_status(event_id, body.status, actor=actor)
    if not event:
        raise HTTPException(status_code=404, detail="SOS event not found")
    return event


@router.post("/hazards", response_model=HazardEvent)
def create_hazard(
    body: HazardCreate,
    service: IncidentService = Depends(get_incident_service),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> HazardEvent:
    return service.add_hazard(idempotency_key=idempotency_key, **body.model_dump(exclude={"settlement_id"}))


@router.get("/hazards", response_model=PaginatedHazards)
def list_hazards(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    service: IncidentService = Depends(get_incident_service),
    _actor: str = Depends(require_planner_key),
) -> PaginatedHazards:
    items, total = service.list_hazards(limit=limit, offset=offset)
    return PaginatedHazards(items=items, total=total, limit=limit, offset=offset)


@router.get("/damage", response_model=PaginatedDamage)
def list_damage(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    service: IncidentService = Depends(get_incident_service),
    _actor: str = Depends(require_planner_key),
) -> PaginatedDamage:
    items, total = service.list_damage(limit=limit, offset=offset)
    return PaginatedDamage(items=items, total=total, limit=limit, offset=offset)
