import json
from typing import Protocol

import httpx
import structlog

from app.config import settings
from app.infrastructure.repositories.outbox import OutboxRepository

logger = structlog.get_logger("ramani.sms")


class SmsProvider(Protocol):
    def send(self, recipient: str, message: str) -> None: ...


class ConsoleSmsProvider:
    def send(self, recipient: str, message: str) -> None:
        logger.info("console_sms_sent", recipient=recipient, message=message)
        print(f"[SMS -> {recipient}] {message}")


class AfricasTalkingSmsProvider:
    def __init__(self) -> None:
        self.username = settings.africas_talking_username
        self.api_key = settings.africas_talking_api_key
        self.sender = settings.africas_talking_sms_sender
        self.url = settings.africas_talking_sms_url

    def send(self, recipient: str, message: str) -> None:
        if not self.api_key:
            logger.error("sms_send_failed", reason="missing_api_key")
            raise RuntimeError("Africa's Talking API key is not configured")
        
        headers = {"apiKey": self.api_key, "Accept": "application/json"}
        data = {
            "username": self.username,
            "to": recipient,
            "message": message,
            "from": self.sender,
        }
        logger.info("sending_africastalking_sms", recipient=recipient, is_sandbox=settings.is_sandbox, url=self.url)
        try:
            response = httpx.post(self.url, headers=headers, data=data, timeout=15.0)
            response.raise_for_status()
            logger.info("africastalking_sms_success", recipient=recipient, status_code=response.status_code)
        except Exception as exc:
            logger.error("africastalking_sms_error", recipient=recipient, error=str(exc))
            raise


def get_sms_provider() -> SmsProvider:
    if settings.sms_enabled and settings.africas_talking_api_key:
        return AfricasTalkingSmsProvider()
    return ConsoleSmsProvider()


def enqueue_sos_confirmation(
    outbox: OutboxRepository,
    phone: str,
    event_id: str,
    landmark_id: str | None,
) -> None:
    landmark = landmark_id or "unknown landmark"
    outbox.enqueue_sms(
        phone,
        f"Ramani SOS received ({event_id[:8]}). Landmark: {landmark}. Help is logged.",
    )


def deliver_outbox_message(provider: SmsProvider, recipient: str, payload: str) -> None:
    provider.send(recipient, payload)
