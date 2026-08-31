from datetime import datetime, timezone
from uuid import uuid4

from app.schemas import DamageReport, HazardEvent, SosEvent

sos_events: list[SosEvent] = []
hazard_events: list[HazardEvent] = []
damage_reports: list[DamageReport] = []


def now() -> datetime:
    return datetime.now(timezone.utc)


def add_sos(**kwargs) -> SosEvent:
    event = SosEvent(id=str(uuid4()), created_at=now(), **kwargs)
    sos_events.insert(0, event)
    return event


def add_hazard(**kwargs) -> HazardEvent:
    event = HazardEvent(id=str(uuid4()), created_at=now(), **kwargs)
    hazard_events.insert(0, event)
    damage_reports.insert(
        0,
        DamageReport(
            id=event.id,
            landmark_id=event.from_landmark,
            kind=event.kind,
            created_at=event.created_at,
            verified=False,
        ),
    )
    return event
