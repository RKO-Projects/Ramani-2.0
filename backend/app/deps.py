from collections.abc import Generator

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.domain.cvi import CviService
from app.domain.incidents import IncidentService
from app.domain.routing.service import RoutingService
from app.infrastructure.database import get_db


def db_session() -> Generator[Session, None, None]:
    yield from get_db()


def get_incident_service(
    db: Session = Depends(db_session),
    settlement_id: str = settings.default_settlement,
) -> IncidentService:
    return IncidentService(db, settlement_id)


def get_routing_service(
    db: Session = Depends(db_session),
    settlement_id: str = settings.default_settlement,
) -> RoutingService:
    return RoutingService(db, settlement_id)


def get_cvi_service(
    db: Session = Depends(db_session),
    settlement_id: str = settings.default_settlement,
) -> CviService:
    return CviService(db, settlement_id)


def require_planner_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> str:
    if not settings.planner_auth_required:
        return "anonymous"
    if not x_api_key or x_api_key != settings.planner_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid planner API key")
    return "planner"
