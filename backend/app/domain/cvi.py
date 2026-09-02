from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.infrastructure.repositories.geospatial import GeospatialRepository
from app.schemas import AlertStatus, CviResponse, CviWeights, CviZone


def _priority(score: float) -> str:
    if score >= 0.75:
        return "critical"
    if score >= 0.6:
        return "high"
    if score >= 0.4:
        return "moderate"
    return "low"


class CviService:
    def __init__(self, db: Session, settlement_id: str = settings.default_settlement) -> None:
        self.db = db
        self.geo = GeospatialRepository(db, settlement_id)
        self.settlement_id = settlement_id

    def compute_cvi(self, weights: CviWeights | None = None) -> CviResponse:
        weights = weights or CviWeights()
        rows = self.geo.latest_cvi_rows()
        if not rows:
            raise ValueError("No CVI observations available for settlement")

        zones: list[CviZone] = []
        for row in rows:
            value = (
                weights.drainage_proximity * row.drainage_proximity
                + weights.structural_density * row.structural_density
                + weights.elevation_slope * row.elevation_slope
                + weights.ghacof_rainfall * row.ghacof_rainfall
            )
            zones.append(
                CviZone(
                    id=row.zone_id,
                    name=row.zone_name,
                    drainage_proximity=row.drainage_proximity,
                    structural_density=row.structural_density,
                    elevation_slope=row.elevation_slope,
                    ghacof_rainfall=row.ghacof_rainfall,
                    cvi=round(value, 3),
                    priority=_priority(value),  # type: ignore[arg-type]
                )
            )
        zones.sort(key=lambda item: item.cvi, reverse=True)
        sample = rows[0]
        return CviResponse(
            outlook=sample.outlook,
            tercile=sample.tercile,  # type: ignore[arg-type]
            weights=weights,
            zones=zones,
            model_version=sample.model_version,
            source=sample.source,
            ingested_at=sample.ingested_at,
        )

    def alert_copy(self) -> AlertStatus:
        rows = self.geo.latest_cvi_rows()
        if not rows:
            return AlertStatus(
                outlook="Unavailable",
                tercile="near_normal",
                el_nino_mode=False,
                headline="Alerts unavailable",
                detail="No outlook ingested yet.",
            )
        sample = rows[0]
        tercile = sample.tercile
        el_nino = sample.el_nino_mode
        if el_nino and tercile == "above_normal":
            headline = "El Niño rainfall: ABOVE NORMAL"
            detail = (
                "Clear drains near Line Saba and Silanga. Move to Highridge or the "
                "Community Center if water rises."
            )
        else:
            headline = f"Seasonal outlook: {tercile.replace('_', ' ').upper()}"
            detail = "Watch local alerts. Report blocked drains on USSD option 3."
        return AlertStatus(
            outlook=sample.outlook,
            tercile=tercile,  # type: ignore[arg-type]
            el_nino_mode=el_nino,
            headline=headline,
            detail=detail,
        )
