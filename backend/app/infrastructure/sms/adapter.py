import json
from typing import Protocol

import httpx

from app.config import settings
from app.infrastructure.repositories.outbox import OutboxRepository


class SmsProvider(Protocol):
    def send(self, recipient: str, message: str) -> None: ...


class ConsoleSmsProvider:
    def send(self, recipient: str, message: str) -> None:
        print(f"[SMS -> {recipient}] {message}")


class AfricasTalkingSmsProvider:
    def __init__(self) -> None:
        self.username = settings.africas_talking_username
        self.api_key = settings.africas_talking_api_key
        self.sender = settings.africas_talking_sms_sender

    def send(self, recipient: str, message: str) -> None:
        if not self.api_key:
            raise RuntimeError("Africa's Talking API key is not configured")
        url = "https://api.africastalking.com/version1/messaging"
        headers = {"apiKey": self.api_key, "Accept": "application/json"}
        data = {
            "username": self.username,
            "to": recipient,
            "message": message,
            "from": self.sender,
        }
        response = httpx.post(url, headers=headers, data=data, timeout=15.0)
        response.raise_for_status()


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
