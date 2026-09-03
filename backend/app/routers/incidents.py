from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.deps import get_incident_service, require_planner_key
from app.domain.incidents import IncidentService
from app.schemas import (
    HazardEvent,
    HazardIngest,
    PaginatedDamage,
    PaginatedHazards,
    PaginatedSos,
    PublicHazard,
    PublicTicket,
    SosCreate,
    SosEvent,
    SosStatusUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["incidents"])


def _ticket_steps(status: str) -> list[str]:
    if status == "resolved":
        return [
            "This ticket is closed.",
            "Send a new SOS if you still need help.",
            "Tell neighbours the all-clear on WhatsApp.",
        ]
    if status == "dispatched":
        return [
            "A runner is on the way.",
            "Stay reachable on the number you registered.",
            "Stay put if water is moving; use the text route if you can leave.",
        ]
    if status == "acknowledged":
        return [
            "A responder has seen this ticket.",
            "Stay reachable on the number you registered.",
            "Stay put if water is moving; use the text route if you can leave.",
        ]
    return [
        "Stay put if it is unsafe to move.",
        "Leaders get a WhatsApp alert with your hashed landmark — not live GPS.",
        "Read the dry-path route or forward this ticket on WhatsApp.",
        "Check this ticket again for acknowledged or resolved.",
    ]


def _hazard_steps() -> list[str]:
    return [
        "Routes now treat this path as unsafe.",
        "Get a new text route from your landmark.",
        "Tell neighbours on WhatsApp.",
        "Open the map — the area should show an alarm light.",
    ]


def public_ticket(event: SosEvent) -> PublicTicket:
    return PublicTicket(
        id=event.id,
        kind=event.kind,
        status=event.status,
        landmark_id=event.landmark_id,
        needs_medical=event.needs_medical,
        created_at=event.created_at,
        source=event.source,
        next_steps=_ticket_steps(event.status),
    )


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


@router.get("/tickets/{event_id}", response_model=PublicTicket)
def get_ticket(
    event_id: str,
    service: IncidentService = Depends(get_incident_service),
) -> PublicTicket:
    event = service.get_sos(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return public_ticket(event)


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
    body: HazardIngest,
    service: IncidentService = Depends(get_incident_service),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> HazardEvent:
    return service.add_hazard(
        idempotency_key=idempotency_key,
        **body.model_dump(exclude={"settlement_id"}),
    )


@router.get("/hazards/{event_id}", response_model=PublicHazard)
def get_hazard(
    event_id: str,
    service: IncidentService = Depends(get_incident_service),
) -> PublicHazard:
    event = service.get_hazard(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Hazard not found")
    return PublicHazard(
        id=event.id,
        kind=event.kind,
        from_landmark=event.from_landmark,
        to_landmark=event.to_landmark,
        created_at=event.created_at,
        next_steps=_hazard_steps(),
    )


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
