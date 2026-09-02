import json
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import settings
from app.infrastructure.models import (
    CviObservationORM,
    GraphEdgeORM,
    IngestionRunORM,
    LandmarkORM,
    SettlementORM,
    utcnow,
)

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


class GeospatialRepository:
    def __init__(self, db: Session, settlement_id: str = settings.default_settlement) -> None:
        self.db = db
        self.settlement_id = settlement_id

    def ensure_settlement(self, settlement_id: str, name: str) -> None:
        if self.db.get(SettlementORM, settlement_id):
            return
        self.db.add(SettlementORM(id=settlement_id, name=name, active=True))
        self.db.flush()

    def seed_from_json_if_empty(self) -> bool:
        existing = self.db.scalar(
            select(LandmarkORM.id).where(LandmarkORM.settlement_id == self.settlement_id).limit(1)
        )
        if existing:
            return False
        self.ensure_settlement(self.settlement_id, "Kibera")
        landmarks = json.loads((DATA_DIR / "kibera_landmarks.json").read_text(encoding="utf-8"))
        for row in landmarks:
            self.db.add(
                LandmarkORM(
                    id=row["id"],
                    settlement_id=self.settlement_id,
                    name=row["name"],
                    zone=row["zone"],
                    lat=row["lat"],
                    lon=row["lon"],
                    safe_haven=row.get("safe_haven", False),
                    graph_version=1,
                )
            )
        graph = json.loads((DATA_DIR / "kibera_graph.json").read_text(encoding="utf-8"))
        for edge in graph["edges"]:
            self.db.add(
                GraphEdgeORM(
                    settlement_id=self.settlement_id,
                    from_landmark=edge["from"],
                    to_landmark=edge["to"],
                    weight=edge["weight"],
                    flood_prone=edge.get("flood_prone", False),
                    graph_version=1,
                )
            )
        cvi = json.loads((DATA_DIR / "kibera_cvi.json").read_text(encoding="utf-8"))
        ingested = utcnow()
        for zone in cvi["zones"]:
            self.db.add(
                CviObservationORM(
                    settlement_id=self.settlement_id,
                    zone_id=zone["id"],
                    zone_name=zone["name"],
                    drainage_proximity=zone["drainage_proximity"],
                    structural_density=zone["structural_density"],
                    elevation_slope=zone["elevation_slope"],
                    ghacof_rainfall=zone["ghacof_rainfall"],
                    outlook=cvi["outlook"],
                    tercile=cvi["tercile"],
                    el_nino_mode=cvi.get("el_nino_mode", False),
                    model_version="cvi-v1",
                    source="seed",
                    ingested_at=ingested,
                )
            )
        self.db.add(
            IngestionRunORM(
                source="seed-json",
                settlement_id=self.settlement_id,
                status="completed",
                records=len(landmarks) + len(graph["edges"]) + len(cvi["zones"]),
                geometry_version=1,
                confidence=1.0,
                started_at=utcnow(),
                finished_at=utcnow(),
            )
        )
        self.db.flush()
        return True

    def seed_mathare(self) -> int:
        self.ensure_settlement("mathare", "Mathare")
        existing = self.db.scalar(
            select(LandmarkORM.id).where(LandmarkORM.settlement_id == "mathare").limit(1)
        )
        if existing:
            return 0
        rows = [
            {
                "id": "mwiki",
                "name": "Mwiki",
                "zone": "Mathare",
                "lat": -1.2621,
                "lon": 36.8584,
                "safe_haven": False,
            },
            {
                "id": "mathare-4a",
                "name": "Mathare 4A",
                "zone": "Mathare",
                "lat": -1.2654,
                "lon": 36.8612,
                "safe_haven": False,
            },
            {
                "id": "mathare-valley",
                "name": "Mathare Valley",
                "zone": "Mathare",
                "lat": -1.2640,
                "lon": 36.8595,
                "safe_haven": False,
                "flood_prone": True,
            },
            {
                "id": "huruma-grounds",
                "name": "Huruma Grounds",
                "zone": "Mathare",
                "lat": -1.2598,
                "lon": 36.8570,
                "safe_haven": True,
            },
        ]
        for row in rows:
            self.db.add(
                LandmarkORM(
                    id=row["id"],
                    settlement_id="mathare",
                    name=row["name"],
                    zone=row["zone"],
                    lat=row["lat"],
                    lon=row["lon"],
                    safe_haven=row.get("safe_haven", False),
                    graph_version=1,
                )
            )
        edges = [
            ("mwiki", "mathare-4a", 2.5, False),
            ("mathare-4a", "mathare-valley", 3.8, True),
            ("mathare-4a", "huruma-grounds", 2.0, False),
            ("mwiki", "huruma-grounds", 3.2, False),
        ]
        for src, dst, weight, flood in edges:
            self.db.add(
                GraphEdgeORM(
                    settlement_id="mathare",
                    from_landmark=src,
                    to_landmark=dst,
                    weight=weight,
                    flood_prone=flood,
                    graph_version=1,
                )
            )
        self.db.add(
            IngestionRunORM(
                source="settlement-bootstrap",
                settlement_id="mathare",
                status="completed",
                records=len(rows) + len(edges),
                geometry_version=1,
                confidence=0.8,
                started_at=utcnow(),
                finished_at=utcnow(),
            )
        )
        self.db.flush()
        return len(rows)

    def list_landmarks(self) -> list[dict]:
        rows = self.db.scalars(
            select(LandmarkORM).where(LandmarkORM.settlement_id == self.settlement_id)
        ).all()
        return [
            {
                "id": row.id,
                "name": row.name,
                "zone": row.zone,
                "lat": row.lat,
                "lon": row.lon,
                "safe_haven": row.safe_haven,
            }
            for row in rows
        ]

    def list_edges(self) -> list[dict]:
        rows = self.db.scalars(
            select(GraphEdgeORM).where(GraphEdgeORM.settlement_id == self.settlement_id)
        ).all()
        return [
            {
                "from": row.from_landmark,
                "to": row.to_landmark,
                "weight": row.weight,
                "flood_prone": row.flood_prone,
                "graph_version": row.graph_version,
            }
            for row in rows
        ]

    def latest_cvi_rows(self) -> list[CviObservationORM]:
        latest = self.db.scalar(
            select(CviObservationORM.ingested_at)
            .where(CviObservationORM.settlement_id == self.settlement_id)
            .order_by(CviObservationORM.ingested_at.desc())
            .limit(1)
        )
        if not latest:
            return []
        return list(
            self.db.scalars(
                select(CviObservationORM).where(
                    CviObservationORM.settlement_id == self.settlement_id,
                    CviObservationORM.ingested_at == latest,
                )
            ).all()
        )

    def latest_graph_version(self) -> int:
        row = self.db.scalar(
            select(GraphEdgeORM.graph_version)
            .where(GraphEdgeORM.settlement_id == self.settlement_id)
            .order_by(GraphEdgeORM.graph_version.desc())
            .limit(1)
        )
        return row or 1

    def latest_ingestion_at(self) -> datetime | None:
        row = self.db.scalar(
            select(IngestionRunORM.finished_at)
            .where(
                IngestionRunORM.settlement_id == self.settlement_id,
                IngestionRunORM.status == "completed",
            )
            .order_by(IngestionRunORM.finished_at.desc())
            .limit(1)
        )
        return row

    def replace_cvi_from_payload(self, payload: dict, *, source: str, confidence: float) -> int:
        self.db.execute(
            delete(CviObservationORM).where(CviObservationORM.settlement_id == self.settlement_id)
        )
        ingested = utcnow()
        for zone in payload["zones"]:
            self.db.add(
                CviObservationORM(
                    settlement_id=self.settlement_id,
                    zone_id=zone["id"],
                    zone_name=zone["name"],
                    drainage_proximity=zone["drainage_proximity"],
                    structural_density=zone["structural_density"],
                    elevation_slope=zone["elevation_slope"],
                    ghacof_rainfall=zone["ghacof_rainfall"],
                    outlook=payload["outlook"],
                    tercile=payload["tercile"],
                    el_nino_mode=payload.get("el_nino_mode", False),
                    model_version="cvi-v1",
                    source=source,
                    ingested_at=ingested,
                )
            )
        self.db.add(
            IngestionRunORM(
                source=source,
                settlement_id=self.settlement_id,
                status="completed",
                records=len(payload["zones"]),
                geometry_version=self.latest_graph_version(),
                confidence=confidence,
                started_at=ingested,
                finished_at=utcnow(),
            )
        )
        self.db.flush()
        return len(payload["zones"])
