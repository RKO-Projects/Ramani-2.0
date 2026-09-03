from app.infrastructure.sms.adapter import ConsoleSmsProvider
from app.infrastructure.repositories.outbox import OutboxRepository


def test_outbox_enqueue_and_console_send(db) -> None:
    repo = OutboxRepository(db)
    before = len(repo.pending())
    message = repo.enqueue_sms("+254700000000", "Test message")
    db.commit()
    ConsoleSmsProvider().send(message.recipient, message.payload)
    pending = repo.pending()
    assert any(row.id == message.id for row in pending)
    assert len(pending) == before + 1
