import json
from functools import lru_cache
from pathlib import Path

from app.schemas import CviResponse, CviWeights, CviZone

DATA = Path(__file__).resolve().parent.parent / "data" / "kibera_cvi.json"


@lru_cache
def _raw() -> dict:
    return json.loads(DATA.read_text(encoding="utf-8"))


def _priority(score: float) -> str:
    if score >= 0.75:
        return "critical"
    if score >= 0.6:
        return "high"
    if score >= 0.4:
        return "moderate"
    return "low"


def score_zone(zone: dict, weights: CviWeights) -> CviZone:
    value = (
        weights.drainage_proximity * zone["drainage_proximity"]
        + weights.structural_density * zone["structural_density"]
        + weights.elevation_slope * zone["elevation_slope"]
        + weights.ghacof_rainfall * zone["ghacof_rainfall"]
    )
    return CviZone(**zone, cvi=round(value, 3), priority=_priority(value))


def compute_cvi(weights: CviWeights | None = None) -> CviResponse:
    payload = _raw()
    weights = weights or CviWeights()
    zones = [score_zone(zone, weights) for zone in payload["zones"]]
    zones.sort(key=lambda item: item.cvi, reverse=True)
    return CviResponse(
        outlook=payload["outlook"],
        tercile=payload["tercile"],
        weights=weights,
        zones=zones,
    )


def alert_copy() -> dict:
    payload = _raw()
    tercile = payload["tercile"]
    el_nino = payload["el_nino_mode"]
    if el_nino and tercile == "above_normal":
        headline = "El Niño rainfall: ABOVE NORMAL"
        detail = "Clear drains near Line Saba and Silanga. Move to Highridge or the Community Center if water rises."
    else:
        headline = f"Seasonal outlook: {tercile.replace('_', ' ').upper()}"
        detail = "Watch local alerts. Report blocked drains on USSD option 3."
    return {
        "outlook": payload["outlook"],
        "tercile": tercile,
        "el_nino_mode": el_nino,
        "headline": headline,
        "detail": detail,
    }
