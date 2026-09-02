import os
import sys

import structlog
from sqlalchemy.orm import Session

from app.infrastructure.database import SessionLocal, init_db
from app.infrastructure.repositories.incidents import PenaltyRepository
from app.infrastructure.repositories.outbox import OutboxRepository
from app.infrastructure.sms.adapter import deliver_outbox_message, get_sms_provider

logger = structlog.get_logger("ramani.worker")


def run_outbox_once(db: Session) -> int:
    repo = OutboxRepository(db)
    provider = get_sms_provider()
    pending = repo.pending()
    dead = repo.dead_letter()
    logger.info("outbox_run_start", pending=len(pending), dead_letter=len(dead))
    processed = 0
    for message in pending:
        try:
            deliver_outbox_message(provider, message.recipient, message.payload)
            repo.mark_sent(message.id)
            logger.info("outbox_message_sent", message_id=message.id, recipient=message.recipient)
            processed += 1
        except Exception as exc:  # noqa: BLE001
            repo.mark_failed(message.id, str(exc))
            logger.warning("outbox_message_failed", message_id=message.id, attempts=message.attempts, error=str(exc))
        db.commit()
    logger.info("outbox_run_complete", processed=processed)
    return processed


def run_penalty_expiry_once(db: Session) -> int:
    count = PenaltyRepository(db).expire_stale()
    db.commit()
    return count


def main() -> None:
    command = sys.argv[1] if len(sys.argv) > 1 else "all"
    init_db()
    db = SessionLocal()
    try:
        if command in {"outbox", "all"}:
            print(f"outbox_processed={run_outbox_once(db)}")
        if command in {"penalties", "all"}:
            print(f"penalties_expired={run_penalty_expiry_once(db)}")
    finally:
        db.close()


if __name__ == "__main__":
    os.environ.setdefault("RAMANI_DATABASE_URL", "sqlite:///./ramani.db")
    main()
