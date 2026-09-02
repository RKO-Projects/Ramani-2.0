from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import OutboxMessageORM, utcnow


class OutboxRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def enqueue_sms(self, recipient: str, message: str) -> OutboxMessageORM:
        row = OutboxMessageORM(
            channel="sms",
            recipient=recipient,
            payload=message,
            status="pending",
            attempts=0,
            created_at=utcnow(),
        )
        self.db.add(row)
        self.db.flush()
        return row

    def pending(self, limit: int = 20) -> list[OutboxMessageORM]:
        return list(
            self.db.scalars(
                select(OutboxMessageORM)
                .where(OutboxMessageORM.status == "pending")
                .order_by(OutboxMessageORM.created_at)
                .limit(limit)
            ).all()
        )

    def mark_sent(self, message_id: int) -> None:
        row = self.db.get(OutboxMessageORM, message_id)
        if not row:
            return
        row.status = "sent"
        row.processed_at = utcnow()
        self.db.flush()

    def mark_failed(self, message_id: int, error: str) -> None:
        row = self.db.get(OutboxMessageORM, message_id)
        if not row:
            return
        row.attempts += 1
        row.last_error = error
        if row.attempts >= 5:
            row.status = "failed"
        row.processed_at = utcnow()
        self.db.flush()


class AuditRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def log(self, *, actor: str, action: str, resource_type: str, resource_id: str, detail: str | None = None) -> None:
        from app.infrastructure.models import AuditLogORM

        self.db.add(
            AuditLogORM(
                actor=actor,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                detail=detail,
                created_at=utcnow(),
            )
        )
        self.db.flush()
