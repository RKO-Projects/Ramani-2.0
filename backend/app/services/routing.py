"""Backward-compatible facade over domain routing service."""

from sqlalchemy.orm import Session

from app.domain.routing.service import RoutingService
from app.schemas import Landmark, RouteResponse

# Legacy tests referenced this module-level dict; kept as a read-through helper.
edge_penalties: dict[tuple[str, str], float] = {}


def _sync_legacy_penalties(db: Session) -> None:
    from app.infrastructure.repositories.incidents import PenaltyRepository

    edge_penalties.clear()
    edge_penalties.update(PenaltyRepository(db).active_penalties())


def landmarks(db: Session | None = None) -> list[Landmark]:
    if db is None:
        from app.infrastructure.database import SessionLocal

        db = SessionLocal()
        try:
            return [Landmark(**item) for item in RoutingService(db).landmarks()]
        finally:
            db.close()
    return [Landmark(**item) for item in RoutingService(db).landmarks()]


def landmark_map(db: Session | None = None) -> dict[str, Landmark]:
    items = landmarks(db)
    return {item.id: item for item in items}


def apply_hazard(from_landmark: str, to_landmark: str, kind: str, db: Session | None = None) -> None:
    if db is None:
        from app.infrastructure.database import SessionLocal

        db = SessionLocal()
        try:
            RoutingService(db).apply_hazard(
                from_landmark=from_landmark,
                to_landmark=to_landmark,
                kind=kind,
                source="legacy",
                hazard_event_id="legacy",
            )
            db.commit()
            _sync_legacy_penalties(db)
        finally:
            db.close()
        return
    RoutingService(db).apply_hazard(
        from_landmark=from_landmark,
        to_landmark=to_landmark,
        kind=kind,
        source="legacy",
        hazard_event_id="legacy",
    )
    _sync_legacy_penalties(db)


def route(from_landmark: str, to_landmark: str | None = None, db: Session | None = None) -> RouteResponse:
    if db is None:
        from app.infrastructure.database import SessionLocal

        db = SessionLocal()
        try:
            return RoutingService(db).route(from_landmark, to_landmark)
        finally:
            db.close()
    return RoutingService(db).route(from_landmark, to_landmark)


def nearest_safe_haven(origin: str, db: Session | None = None) -> str:
    result = route(origin, db=db)
    return result.to_landmark
