from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_routing_service
from app.domain.routing.service import RoutingService
from app.schemas import Landmark, RouteRequest, RouteResponse

router = APIRouter(prefix="/api/v1", tags=["routing"])


@router.get("/landmarks", response_model=list[Landmark])
def list_landmarks(service: RoutingService = Depends(get_routing_service)) -> list[Landmark]:
    return [Landmark(**item) for item in service.landmarks()]


@router.post("/routes", response_model=RouteResponse)
def create_route(
    body: RouteRequest,
    service: RoutingService = Depends(get_routing_service),
) -> RouteResponse:
    try:
        return service.route(body.from_landmark, body.to_landmark)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown landmark: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
