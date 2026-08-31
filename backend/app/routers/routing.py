from fastapi import APIRouter, HTTPException

from app.schemas import Landmark, RouteRequest, RouteResponse
from app.services import routing

router = APIRouter(prefix="/api/v1", tags=["routing"])


@router.get("/landmarks", response_model=list[Landmark])
def list_landmarks() -> list[Landmark]:
    return routing.landmarks()


@router.post("/routes", response_model=RouteResponse)
def create_route(body: RouteRequest) -> RouteResponse:
    try:
        return routing.route(body.from_landmark, body.to_landmark)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown landmark: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
