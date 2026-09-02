"""Backward-compatible facade over domain CVI service."""

from sqlalchemy.orm import Session

from app.domain.cvi import CviService
from app.schemas import CviResponse, CviWeights


def compute_cvi(weights: CviWeights | None = None, db: Session | None = None) -> CviResponse:
    if db is None:
        from app.infrastructure.database import SessionLocal

        db = SessionLocal()
        try:
            return CviService(db).compute_cvi(weights)
        finally:
            db.close()
    return CviService(db).compute_cvi(weights)


def alert_copy(db: Session | None = None) -> dict:
    if db is None:
        from app.infrastructure.database import SessionLocal

        db = SessionLocal()
        try:
            alert = CviService(db).alert_copy()
        finally:
            db.close()
        return alert.model_dump()
    return CviService(db).alert_copy().model_dump()
