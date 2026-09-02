from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.deps import get_cvi_service, require_planner_key
from app.domain.cvi import CviService
from app.schemas import AlertStatus, CviResponse, CviWeights

router = APIRouter(prefix="/api/v1", tags=["cvi"])


@router.get("/cvi", response_model=CviResponse)
def get_cvi(service: CviService = Depends(get_cvi_service)) -> CviResponse:
    return service.compute_cvi()


@router.post("/cvi", response_model=CviResponse)
def cvi_with_weights(
    weights: CviWeights,
    service: CviService = Depends(get_cvi_service),
) -> CviResponse:
    return service.compute_cvi(weights)


@router.get("/cvi/layers")
def layers() -> dict:
    return {
        "layers": [
            {"id": "flood", "label": "Flood vulnerability"},
            {"id": "heat", "label": "Urban heat intensity"},
            {"id": "density", "label": "Structural density"},
        ]
    }


@router.get("/alerts", response_model=AlertStatus)
def alerts(service: CviService = Depends(get_cvi_service)) -> AlertStatus:
    return service.alert_copy()
