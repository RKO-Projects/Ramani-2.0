from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

HazardKind = Literal["blocked_drainage", "rising_water", "damaged_structure"]
SosKind = Literal["flood_trapped", "collapse_fire", "medical"]
OutlookTercile = Literal["above_normal", "near_normal", "below_normal"]
SosStatus = Literal["open", "acknowledged", "resolved"]


class CviWeights(BaseModel):
    drainage_proximity: float = Field(0.30, ge=0, le=1)
    structural_density: float = Field(0.25, ge=0, le=1)
    elevation_slope: float = Field(0.25, ge=0, le=1)
    ghacof_rainfall: float = Field(0.20, ge=0, le=1)


class CviZone(BaseModel):
    id: str
    name: str
    drainage_proximity: float
    structural_density: float
    elevation_slope: float
    ghacof_rainfall: float
    cvi: float
    priority: Literal["low", "moderate", "high", "critical"]


class CviResponse(BaseModel):
    outlook: str
    tercile: OutlookTercile
    weights: CviWeights
    zones: list[CviZone]
    model_version: str = "cvi-v1"
    source: str = "seed"
    ingested_at: datetime | None = None


class Landmark(BaseModel):
    id: str
    name: str
    zone: str
    lat: float
    lon: float
    safe_haven: bool = False


class RouteRequest(BaseModel):
    from_landmark: str
    to_landmark: str | None = None
    settlement_id: str | None = None


class HazardEvidence(BaseModel):
    from_landmark: str
    to_landmark: str
    multiplier: float
    kind: str
    source: str
    hazard_event_id: str | None = None
    expires_at: str


class RouteResponse(BaseModel):
    from_landmark: str
    to_landmark: str
    path: list[str]
    names: list[str]
    ussd_text: str
    avoided: list[str]
    disclaimer: str
    graph_version: int = 1
    hazard_evidence: list[dict] = Field(default_factory=list)
    computed_at: datetime | None = None
    route_cost: float | None = None
    penalty_expires_at: datetime | None = None


class SosCreate(BaseModel):
    kind: SosKind
    landmark_id: str | None = None
    note: str | None = None
    phone: str | None = None
    source: Literal["pwa", "ussd"] = "pwa"
    settlement_id: str | None = None


class SosEvent(SosCreate):
    id: str
    created_at: datetime
    status: SosStatus = "open"


class SosStatusUpdate(BaseModel):
    status: SosStatus


class HazardCreate(BaseModel):
    kind: HazardKind
    from_landmark: str
    to_landmark: str
    note: str | None = None
    source: Literal["pwa", "ussd"] = "pwa"
    settlement_id: str | None = None


class HazardEvent(HazardCreate):
    id: str
    created_at: datetime


class AlertStatus(BaseModel):
    outlook: str
    tercile: OutlookTercile
    el_nino_mode: bool
    headline: str
    detail: str


class DamageReport(BaseModel):
    id: str
    landmark_id: str
    kind: str
    created_at: datetime
    verified: bool = False


class PaginatedSos(BaseModel):
    items: list[SosEvent]
    total: int
    limit: int
    offset: int


class PaginatedHazards(BaseModel):
    items: list[HazardEvent]
    total: int
    limit: int
    offset: int


class PaginatedDamage(BaseModel):
    items: list[DamageReport]
    total: int
    limit: int
    offset: int


class SettlementInfo(BaseModel):
    id: str
    name: str
    active: bool


class IngestionStatus(BaseModel):
    source: str
    settlement_id: str
    records: int
    geometry_version: int
    confidence: float
    finished_at: datetime | None


class SatelliteLayerStatus(BaseModel):
    settlement_id: str
    layer_type: str
    source: str
    confidence: float
    active: bool
    captured_at: datetime
