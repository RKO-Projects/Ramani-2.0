from fastapi import APIRouter

from app.schemas import DamageReport, HazardCreate, HazardEvent, SosCreate, SosEvent
from app.services import routing, store

router = APIRouter(prefix="/api/v1", tags=["incidents"])


@router.post("/sos", response_model=SosEvent)
def create_sos(body: SosCreate) -> SosEvent:
    return store.add_sos(**body.model_dump())


@router.get("/sos", response_model=list[SosEvent])
def list_sos() -> list[SosEvent]:
    return store.sos_events


@router.post("/hazards", response_model=HazardEvent)
def create_hazard(body: HazardCreate) -> HazardEvent:
    routing.apply_hazard(body.from_landmark, body.to_landmark, body.kind)
    return store.add_hazard(**body.model_dump())


@router.get("/hazards", response_model=list[HazardEvent])
def list_hazards() -> list[HazardEvent]:
    return store.hazard_events


@router.get("/damage", response_model=list[DamageReport])
def list_damage() -> list[DamageReport]:
    return store.damage_reports
