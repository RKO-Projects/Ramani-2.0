from sqlalchemy.orm import Session

from app.config import settings
from app.domain.routing.service import RoutingService
from app.infrastructure.media import save_media
from app.infrastructure.repositories.geospatial import GeospatialRepository
from app.infrastructure.repositories.incidents import IncidentRepository, PenaltyRepository
from app.infrastructure.repositories.outbox import AuditRepository, OutboxRepository
from app.infrastructure.sms.adapter import enqueue_sos_confirmation
from app.infrastructure.whatsapp import enqueue_responder_alerts
from app.middleware.privacy import cell_location_hash, hash_phone
from app.schemas import DamageReport, HazardEvent, SosEvent


class IncidentService:
    def __init__(self, db: Session, settlement_id: str = settings.default_settlement) -> None:
        self.db = db
        self.settlement_id = settlement_id
        self.repo = IncidentRepository(db, settlement_id)
        self.penalties = PenaltyRepository(db, settlement_id)
        self.routing = RoutingService(db, settlement_id)
        self.outbox = OutboxRepository(db)
        self.audit = AuditRepository(db)
        self.geo = GeospatialRepository(db, settlement_id)

    def add_sos(self, *, idempotency_key: str | None = None, **kwargs) -> SosEvent:
        lat = kwargs.pop("lat", None)
        lon = kwargs.pop("lon", None)
        kwargs.pop("accuracy_m", None)
        kwargs.pop("settlement_id", None)
        kwargs.pop("phone_hash", None)
        kwargs.pop("phone_masked", None)
        client_hash = kwargs.pop("location_hash", None)

        if kwargs.get("landmark_id") is None and lat is not None and lon is not None:
            kwargs["landmark_id"] = self._snap_landmark(float(lat), float(lon))

        landmark_id = kwargs.get("landmark_id")
        phone = kwargs.get("phone")
        kind = kwargs.get("kind") or ""
        needs_medical = bool(kwargs.pop("needs_medical", False) or kind == "medical")
        location_hash = client_hash or cell_location_hash(landmark_id, self.settlement_id)

        event = self.repo.add_sos(
            idempotency_key=idempotency_key,
            phone_hash=hash_phone(phone),
            needs_medical=needs_medical,
            location_hash=location_hash,
            **kwargs,
        )
        if event.phone:
            enqueue_sos_confirmation(self.outbox, event.phone, event.id, event.landmark_id)
        landmark_name = self._landmark_name(event.landmark_id)
        enqueue_responder_alerts(
            self.outbox,
            event_id=event.id,
            kind=event.kind,
            landmark_id=event.landmark_id,
            landmark_name=landmark_name,
            phone=event.phone,
            needs_medical=needs_medical,
        )
        self.audit.log(
            actor=event.source,
            action="sos_created",
            resource_type="sos",
            resource_id=event.id,
            detail=event.kind,
        )
        self.db.commit()
        return event

    def list_sos(
        self,
        *,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[SosEvent], int]:
        return self.repo.list_sos(status=status, limit=limit, offset=offset)

    def update_sos_status(self, event_id: str, status: str, *, actor: str = "planner") -> SosEvent | None:
        event = self.repo.update_sos_status(event_id, status)
        if event:
            self.audit.log(
                actor=actor,
                action="sos_status_updated",
                resource_type="sos",
                resource_id=event_id,
                detail=status,
            )
            self.db.commit()
        return event

    def add_hazard(self, *, idempotency_key: str | None = None, **kwargs) -> HazardEvent:
        photo_b64 = kwargs.pop("photo_b64", None)
        voice_b64 = kwargs.pop("voice_b64", None)
        kwargs.pop("settlement_id", None)
        kwargs.pop("has_photo", None)
        kwargs.pop("has_voice", None)
        event = self.repo.add_hazard(idempotency_key=idempotency_key, **kwargs)
        photo_path, voice_path = save_media(event.id, photo_b64, voice_b64)
        if photo_path or voice_path:
            from app.infrastructure.models import HazardEventORM

            row = self.db.get(HazardEventORM, event.id)
            if row:
                row.photo_path = photo_path
                row.voice_path = voice_path
                self.db.flush()
                event = self.repo._hazard_to_schema(row)
        self.routing.apply_hazard(
            from_landmark=event.from_landmark,
            to_landmark=event.to_landmark,
            kind=event.kind,
            source=event.source,
            hazard_event_id=event.id,
        )
        self.audit.log(
            actor=event.source,
            action="hazard_created",
            resource_type="hazard",
            resource_id=event.id,
            detail=event.kind,
        )
        self.db.commit()
        return event

    def list_hazards(self, *, limit: int = 50, offset: int = 0) -> tuple[list[HazardEvent], int]:
        return self.repo.list_hazards(limit=limit, offset=offset)

    def list_damage(self, *, limit: int = 50, offset: int = 0) -> tuple[list[DamageReport], int]:
        return self.repo.list_damage(limit=limit, offset=offset)

    def _snap_landmark(self, lat: float, lon: float) -> str | None:
        best_id = None
        best_d = float("inf")
        for row in self.geo.list_landmarks():
            d = (float(row["lat"]) - lat) ** 2 + (float(row["lon"]) - lon) ** 2
            if d < best_d:
                best_d = d
                best_id = row["id"]
        return best_id

    def _landmark_name(self, landmark_id: str | None) -> str | None:
        if not landmark_id:
            return None
        from app.infrastructure.media import landmark_names

        return landmark_names().get(landmark_id, landmark_id)
