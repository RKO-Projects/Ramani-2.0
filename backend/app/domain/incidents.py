from sqlalchemy.orm import Session

from app.config import settings
from app.domain.routing.service import RoutingService
from app.infrastructure.repositories.geospatial import GeospatialRepository
from app.infrastructure.repositories.incidents import IncidentRepository, PenaltyRepository
from app.infrastructure.repositories.outbox import AuditRepository, OutboxRepository
from app.infrastructure.sms.adapter import enqueue_sos_confirmation
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

    def add_sos(self, *, idempotency_key: str | None = None, **kwargs) -> SosEvent:
        event = self.repo.add_sos(idempotency_key=idempotency_key, **kwargs)
        if event.phone:
            enqueue_sos_confirmation(self.outbox, event.phone, event.id, event.landmark_id)
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
        event = self.repo.add_hazard(idempotency_key=idempotency_key, **kwargs)
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
