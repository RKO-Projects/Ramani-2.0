import re
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.infrastructure.models import (
    DamageReportORM,
    EdgePenaltyORM,
    HazardEventORM,
    IdempotencyKeyORM,
    SosEventORM,
    utcnow,
)
from app.middleware.privacy import mask_phone
from app.schemas import DamageReport, HazardEvent, SosEvent


def _edge_key(a: str, b: str) -> tuple[str, str]:
    return (a, b) if a < b else (b, a)


_GPS_NOTE = re.compile(r"gps:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:\s*(?:±|\+/-)(\d+)m)?")


def _gps_from_note(note: str | None) -> tuple[float | None, float | None, float | None]:
    if not note:
        return None, None, None
    match = _GPS_NOTE.search(note)
    if not match:
        return None, None, None
    acc = float(match.group(3)) if match.group(3) else None
    return float(match.group(1)), float(match.group(2)), acc


class IncidentRepository:
    def __init__(self, db: Session, settlement_id: str = settings.default_settlement) -> None:
        self.db = db
        self.settlement_id = settlement_id

    def get_idempotent(self, key: str) -> IdempotencyKeyORM | None:
        return self.db.get(IdempotencyKeyORM, key)

    def save_idempotent(self, key: str, resource_type: str, resource_id: str) -> None:
        self.db.add(
            IdempotencyKeyORM(key=key, resource_type=resource_type, resource_id=resource_id)
        )

    def add_sos(
        self,
        *,
        kind: str,
        landmark_id: str | None = None,
        note: str | None = None,
        phone: str | None = None,
        source: str = "pwa",
        idempotency_key: str | None = None,
        phone_hash: str | None = None,
        needs_medical: bool = False,
        location_hash: str | None = None,
    ) -> SosEvent:
        if idempotency_key:
            existing = self.get_idempotent(idempotency_key)
            if existing:
                row = self.db.get(SosEventORM, existing.resource_id)
                if row:
                    return self._sos_to_schema(row)

        event_id = str(uuid4())
        row = SosEventORM(
            id=event_id,
            kind=kind,
            landmark_id=landmark_id,
            note=note,
            phone=phone,
            source=source,
            status="open",
            settlement_id=self.settlement_id,
            created_at=utcnow(),
            updated_at=utcnow(),
            phone_hash=phone_hash,
            needs_medical=needs_medical,
            location_hash=location_hash,
        )
        self.db.add(row)
        if idempotency_key:
            self.save_idempotent(idempotency_key, "sos", event_id)
        self.db.flush()
        return self._sos_to_schema(row)

    def list_sos(
        self,
        *,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[SosEvent], int]:
        filters = [SosEventORM.settlement_id == self.settlement_id]
        if status:
            filters.append(SosEventORM.status == status)
        total = self.db.scalar(select(func.count()).select_from(SosEventORM).where(*filters)) or 0
        rows = self.db.scalars(
            select(SosEventORM)
            .where(*filters)
            .order_by(desc(SosEventORM.created_at))
            .limit(limit)
            .offset(offset)
        ).all()
        return [self._sos_to_schema(row) for row in rows], total

    def get_sos(self, event_id: str) -> SosEvent | None:
        row = self.db.get(SosEventORM, event_id)
        if not row:
            return None
        return self._sos_to_schema(row)

    def get_hazard(self, event_id: str) -> HazardEvent | None:
        row = self.db.get(HazardEventORM, event_id)
        if not row:
            return None
        return self._hazard_to_schema(row)

    def update_sos_status(self, event_id: str, status: str) -> SosEvent | None:
        row = self.db.get(SosEventORM, event_id)
        if not row:
            return None
        row.status = status
        row.updated_at = utcnow()
        self.db.flush()
        return self._sos_to_schema(row)

    def add_hazard(
        self,
        *,
        kind: str,
        from_landmark: str,
        to_landmark: str,
        note: str | None = None,
        source: str = "pwa",
        idempotency_key: str | None = None,
        photo_path: str | None = None,
        voice_path: str | None = None,
    ) -> HazardEvent:
        if idempotency_key:
            existing = self.get_idempotent(idempotency_key)
            if existing:
                row = self.db.get(HazardEventORM, existing.resource_id)
                if row:
                    return self._hazard_to_schema(row)

        event_id = str(uuid4())
        created = utcnow()
        hazard = HazardEventORM(
            id=event_id,
            kind=kind,
            from_landmark=from_landmark,
            to_landmark=to_landmark,
            note=note,
            source=source,
            verified=False,
            settlement_id=self.settlement_id,
            created_at=created,
            photo_path=photo_path,
            voice_path=voice_path,
        )
        self.db.add(hazard)
        self.db.flush()
        damage = DamageReportORM(
            id=event_id,
            landmark_id=from_landmark,
            kind=kind,
            verified=False,
            settlement_id=self.settlement_id,
            created_at=created,
            hazard_event_id=event_id,
        )
        self.db.add(damage)
        if idempotency_key:
            self.save_idempotent(idempotency_key, "hazard", event_id)
        self.db.flush()
        return self._hazard_to_schema(hazard)

    def list_hazards(self, *, limit: int = 50, offset: int = 0) -> tuple[list[HazardEvent], int]:
        filters = [HazardEventORM.settlement_id == self.settlement_id]
        total = self.db.scalar(select(func.count()).select_from(HazardEventORM).where(*filters)) or 0
        rows = self.db.scalars(
            select(HazardEventORM)
            .where(*filters)
            .order_by(desc(HazardEventORM.created_at))
            .limit(limit)
            .offset(offset)
        ).all()
        return [self._hazard_to_schema(row) for row in rows], total

    def list_damage(self, *, limit: int = 50, offset: int = 0) -> tuple[list[DamageReport], int]:
        filters = [DamageReportORM.settlement_id == self.settlement_id]
        total = self.db.scalar(select(func.count()).select_from(DamageReportORM).where(*filters)) or 0
        rows = self.db.scalars(
            select(DamageReportORM)
            .where(*filters)
            .order_by(desc(DamageReportORM.created_at))
            .limit(limit)
            .offset(offset)
        ).all()
        return [self._damage_to_schema(row) for row in rows], total

    @staticmethod
    def _sos_to_schema(row: SosEventORM) -> SosEvent:
        lat, lon, accuracy_m = _gps_from_note(row.note)
        return SosEvent(
            id=row.id,
            kind=row.kind,  # type: ignore[arg-type]
            landmark_id=row.landmark_id,
            note=row.note,
            phone=row.phone,
            source=row.source,  # type: ignore[arg-type]
            status=row.status,  # type: ignore[arg-type]
            created_at=row.created_at,
            lat=lat,
            lon=lon,
            accuracy_m=accuracy_m,
            needs_medical=bool(getattr(row, "needs_medical", False)),
            location_hash=getattr(row, "location_hash", None),
            phone_hash=getattr(row, "phone_hash", None),
            phone_masked=mask_phone(row.phone),
        )

    @staticmethod
    def _hazard_to_schema(row: HazardEventORM) -> HazardEvent:
        return HazardEvent(
            id=row.id,
            kind=row.kind,  # type: ignore[arg-type]
            from_landmark=row.from_landmark,
            to_landmark=row.to_landmark,
            note=row.note,
            source=row.source,  # type: ignore[arg-type]
            created_at=row.created_at,
            has_photo=bool(getattr(row, "photo_path", None)),
            has_voice=bool(getattr(row, "voice_path", None)),
        )

    @staticmethod
    def _damage_to_schema(row: DamageReportORM) -> DamageReport:
        return DamageReport(
            id=row.id,
            landmark_id=row.landmark_id,
            kind=row.kind,
            created_at=row.created_at,
            verified=row.verified,
        )


class PenaltyRepository:
    def __init__(self, db: Session, settlement_id: str = settings.default_settlement) -> None:
        self.db = db
        self.settlement_id = settlement_id

    def apply_hazard(
        self,
        *,
        from_landmark: str,
        to_landmark: str,
        kind: str,
        source: str,
        hazard_event_id: str,
        ttl_hours: int | None = None,
    ) -> EdgePenaltyORM:
        bump = 8.0 if kind == "rising_water" else 5.0
        a, b = _edge_key(from_landmark, to_landmark)
        now = utcnow()
        expires = now + timedelta(hours=ttl_hours or settings.hazard_penalty_ttl_hours)

        row = self.db.scalar(
            select(EdgePenaltyORM).where(
                EdgePenaltyORM.settlement_id == self.settlement_id,
                EdgePenaltyORM.from_landmark == a,
                EdgePenaltyORM.to_landmark == b,
                EdgePenaltyORM.expires_at > now,
            )
        )
        if row:
            row.multiplier *= bump
            row.kind = kind
            row.source = source
            row.hazard_event_id = hazard_event_id
            row.expires_at = expires
        else:
            row = EdgePenaltyORM(
                settlement_id=self.settlement_id,
                from_landmark=a,
                to_landmark=b,
                multiplier=bump,
                kind=kind,
                source=source,
                verified=False,
                hazard_event_id=hazard_event_id,
                created_at=now,
                expires_at=expires,
            )
            self.db.add(row)
        self.db.flush()
        return row

    def active_penalties(self, at: datetime | None = None) -> dict[tuple[str, str], float]:
        moment = at or utcnow()
        rows = self.db.scalars(
            select(EdgePenaltyORM).where(
                EdgePenaltyORM.settlement_id == self.settlement_id,
                EdgePenaltyORM.expires_at > moment,
            )
        ).all()
        return {(row.from_landmark, row.to_landmark): row.multiplier for row in rows}

    def expire_stale(self, at: datetime | None = None) -> int:
        moment = at or utcnow()
        rows = self.db.scalars(
            select(EdgePenaltyORM).where(
                EdgePenaltyORM.settlement_id == self.settlement_id,
                EdgePenaltyORM.expires_at <= moment,
            )
        ).all()
        count = len(rows)
        for row in rows:
            self.db.delete(row)
        self.db.flush()
        return count

    def hazard_evidence(self, at: datetime | None = None) -> list[dict]:
        moment = at or utcnow()
        rows = self.db.scalars(
            select(EdgePenaltyORM).where(
                EdgePenaltyORM.settlement_id == self.settlement_id,
                EdgePenaltyORM.expires_at > moment,
            )
        ).all()
        return [
            {
                "from_landmark": row.from_landmark,
                "to_landmark": row.to_landmark,
                "multiplier": row.multiplier,
                "kind": row.kind,
                "source": row.source,
                "hazard_event_id": row.hazard_event_id,
                "expires_at": row.expires_at.isoformat(),
            }
            for row in rows
        ]
