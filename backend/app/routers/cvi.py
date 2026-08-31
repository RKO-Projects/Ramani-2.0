from fastapi import APIRouter

from app.schemas import AlertStatus, CviResponse, CviWeights
from app.services import cvi

router = APIRouter(prefix="/api/v1", tags=["cvi"])


@router.get("/cvi", response_model=CviResponse)
def get_cvi() -> CviResponse:
    return cvi.compute_cvi()


@router.post("/cvi", response_model=CviResponse)
def cvi_with_weights(weights: CviWeights) -> CviResponse:
    return cvi.compute_cvi(weights)


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
def alerts() -> AlertStatus:
    return AlertStatus(**cvi.alert_copy())
