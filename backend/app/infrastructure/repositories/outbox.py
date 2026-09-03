from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import OutboxMessageORM, utcnow


class OutboxRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def enqueue_sms(self, recipient: str, message: str) -> OutboxMessageORM:
        return self.enqueue("sms", recipient, message)

    def enqueue(self, channel: str, recipient: str, payload: str) -> OutboxMessageORM:
        row = OutboxMessageORM(
            channel=channel,
            recipient=recipient,
            payload=payload,
            status="pending",
            attempts=0,
            created_at=utcnow(),
        )
        self.db.add(row)
        self.db.flush()
        return row

    def pending(self, limit: int = 20) -> list[OutboxMessageORM]:
        """Return pending messages, skipping recently-failed ones (exponential backoff).

        After each failure, the message is held back for 2^attempts minutes,
        capped at 24 hours. This prevents hammering a failing SMS provider.
        """
        now = utcnow()
        rows = list(
            self.db.scalars(
                select(OutboxMessageORM)
                .where(OutboxMessageORM.status == "pending")
                .order_by(OutboxMessageORM.created_at)
                .limit(limit * 5)  # fetch extra so we can filter by backoff
            ).all()
        )
        eligible = []
        for row in rows:
            if row.attempts == 0:
                eligible.append(row)
            else:
                # Exponential backoff: 2^attempts minutes, capped at 24h
                delay_minutes = min(2 ** row.attempts, 24 * 60)
                next_retry = (row.processed_at or row.created_at) + timedelta(minutes=delay_minutes)
                if now >= next_retry:
                    eligible.append(row)
            if len(eligible) >= limit:
                break
        return eligible

    def dead_letter(self, limit: int = 50) -> list[OutboxMessageORM]:
        """Return messages that have permanently failed (5+ attempts)."""
        return list(
            self.db.scalars(
                select(OutboxMessageORM)
                .where(OutboxMessageORM.status == "failed")
                .order_by(OutboxMessageORM.created_at.desc())
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
