from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

HazardKind = Literal["blocked_drainage", "rising_water", "damaged_structure"]
SosKind = Literal["flood_trapped", "collapse_fire", "medical"]
OutlookTercile = Literal["above_normal", "near_normal", "below_normal"]


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


class RouteResponse(BaseModel):
    from_landmark: str
    to_landmark: str
    path: list[str]
    names: list[str]
    ussd_text: str
    avoided: list[str]
    disclaimer: str


class SosCreate(BaseModel):
    kind: SosKind
    landmark_id: str | None = None
    note: str | None = None
    phone: str | None = None
    source: Literal["pwa", "ussd"] = "pwa"


class SosEvent(SosCreate):
    id: str
    created_at: datetime
    status: Literal["open", "ack"] = "open"


class HazardCreate(BaseModel):
    kind: HazardKind
    from_landmark: str
    to_landmark: str
    note: str | None = None
    source: Literal["pwa", "ussd"] = "pwa"


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
