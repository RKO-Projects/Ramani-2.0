from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_cvi_service, get_incident_service, get_routing_service
from app.domain.areas import build_area_detail, build_area_map
from app.domain.cvi import CviService
from app.domain.incidents import IncidentService
from app.domain.routing.service import RoutingService
from app.schemas import AreaDetail, AreaMap

router = APIRouter(prefix="/api/v1", tags=["areas"])


@router.get("/areas", response_model=AreaMap)
def list_areas(
    routing: RoutingService = Depends(get_routing_service),
    cvi: CviService = Depends(get_cvi_service),
    incidents: IncidentService = Depends(get_incident_service),
) -> AreaMap:
    try:
        return build_area_map(routing, cvi, incidents)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/areas/{area_id}", response_model=AreaDetail)
def get_area(
    area_id: str,
    routing: RoutingService = Depends(get_routing_service),
    cvi: CviService = Depends(get_cvi_service),
    incidents: IncidentService = Depends(get_incident_service),
) -> AreaDetail:
    try:
        payload = build_area_map(routing, cvi, incidents)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    detail = build_area_detail(area_id, payload, cvi)
    if not detail:
        raise HTTPException(status_code=404, detail="Unknown area")
    return detail
