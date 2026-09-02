from datetime import datetime, timedelta, timezone

from app.config import settings


def penalty_multiplier(kind: str) -> float:
    return 8.0 if kind == "rising_water" else 5.0


def default_expiry(now: datetime | None = None) -> datetime:
    moment = now or datetime.now(timezone.utc)
    return moment + timedelta(hours=settings.hazard_penalty_ttl_hours)


def is_penalty_active(expires_at: datetime, at: datetime | None = None) -> bool:
    moment = at or datetime.now(timezone.utc)
    return expires_at > moment
