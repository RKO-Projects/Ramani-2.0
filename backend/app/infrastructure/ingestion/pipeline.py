import hashlib
import hmac
import json
import re
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.infrastructure.models import IngestionRunORM, SatelliteLayerORM, utcnow
from app.infrastructure.repositories.geospatial import GeospatialRepository, DATA_DIR


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith("0"):
        return "+254" + digits[1:]
    if digits.startswith("254"):
        return "+" + digits
    if digits.startswith("7") and len(digits) == 9:
        return "+254" + digits
    return phone


def verify_ussd_webhook(payload: str, signature: str | None) -> bool:
    secret = settings.ussd_webhook_secret
    if not secret:
        return True
    if not signature:
        return False
    digest = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature)


def ingest_ghacof(db: Session, settlement_id: str = settings.default_settlement) -> IngestionRunORM:
    payload = json.loads((DATA_DIR / "kibera_cvi.json").read_text(encoding="utf-8"))
    repo = GeospatialRepository(db, settlement_id)
    repo.ensure_settlement(settlement_id, settlement_id.title())
    repo.replace_cvi_from_payload(payload, source="ghacof", confidence=0.9)
    db.commit()
    row = db.scalar(
        select(IngestionRunORM)
        .where(
            IngestionRunORM.settlement_id == settlement_id,
            IngestionRunORM.source == "ghacof",
        )
        .order_by(IngestionRunORM.finished_at.desc())
        .limit(1)
    )
    assert row is not None
    return row


def ingest_map_traces(db: Session, settlement_id: str = settings.default_settlement) -> IngestionRunORM:
    repo = GeospatialRepository(db, settlement_id)
    seeded = repo.seed_from_json_if_empty()
    started = utcnow()
    records = 0
    if seeded:
        records = len(repo.list_landmarks()) + len(repo.list_edges())
    row = IngestionRunORM(
        source="map-kibera-osm",
        settlement_id=settlement_id,
        status="completed",
        records=records,
        geometry_version=repo.latest_graph_version(),
        confidence=0.85 if seeded else 1.0,
        started_at=started,
        finished_at=utcnow(),
    )
    db.add(row)
    db.commit()
    return row


def register_satellite_layer_stub(
    db: Session,
    *,
    settlement_id: str,
    layer_type: str,
    source: str,
    confidence: float,
) -> SatelliteLayerORM:
    row = SatelliteLayerORM(
        settlement_id=settlement_id,
        layer_type=layer_type,
        source=source,
        captured_at=utcnow(),
        confidence=confidence,
        metadata_json=json.dumps({"status": "stub", "requires_clear_sky": True}),
        active=False,
    )
    db.add(row)
    db.commit()
    return row
