import json
from typing import Protocol

import httpx
import structlog

from app.config import settings
from app.infrastructure.media import nearest_help
from app.infrastructure.repositories.outbox import OutboxRepository
from app.middleware.privacy import mask_phone

logger = structlog.get_logger("ramani.whatsapp")


class WhatsAppProvider(Protocol):
    def send(self, recipient: str, message: str) -> None: ...


class ConsoleWhatsAppProvider:
    def send(self, recipient: str, message: str) -> None:
        logger.info("console_whatsapp_sent", recipient=recipient)
        print(f"[WhatsApp -> {recipient}]\n{message}")


class CloudWhatsAppProvider:
    def send(self, recipient: str, message: str) -> None:
        if not settings.whatsapp_token or not settings.whatsapp_phone_id:
            raise RuntimeError("WhatsApp Cloud API is not configured")
        url = f"https://graph.facebook.com/v21.0/{settings.whatsapp_phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {settings.whatsapp_token}",
            "Content-Type": "application/json",
        }
        digits = recipient.replace("+", "")
        body = {
            "messaging_product": "whatsapp",
            "to": digits,
            "type": "text",
            "text": {"body": message, "preview_url": True},
        }
        response = httpx.post(url, headers=headers, json=body, timeout=15.0)
        response.raise_for_status()


def get_whatsapp_provider() -> WhatsAppProvider:
    if settings.whatsapp_token and settings.whatsapp_phone_id:
        return CloudWhatsAppProvider()
    return ConsoleWhatsAppProvider()


def format_sos_alert(
    *,
    event_id: str,
    kind: str,
    landmark_id: str | None,
    landmark_name: str | None,
    phone: str | None,
    needs_medical: bool,
    wait_label: str = "just now",
) -> str:
    help_row = nearest_help(landmark_id)
    place = landmark_name or landmark_id or "unknown landmark"
    if help_row:
        place = f"{place} - Near {help_row['name']}"
    kind_label = kind.replace("_", " ")
    if needs_medical and "medical" not in kind_label:
        kind_label = f"{kind_label} + medical"
    ticket = f"{settings.ops_public_url.rstrip('/')}/emergency#{event_id}"
    contact = mask_phone(phone) or "withheld"
    return (
        "🚨 RAMANI EMERGENCY ALERT\n\n"
        f"Type: {kind_label.title()}\n"
        f"Landmark: {place}\n"
        f"Wait Time: {wait_label}\n"
        f"Contact: {contact}\n"
        f"Ops Ticket: {ticket}"
    )


def enqueue_responder_alerts(
    outbox: OutboxRepository,
    *,
    event_id: str,
    kind: str,
    landmark_id: str | None,
    landmark_name: str | None,
    phone: str | None,
    needs_medical: bool,
) -> int:
    message = format_sos_alert(
        event_id=event_id,
        kind=kind,
        landmark_id=landmark_id,
        landmark_name=landmark_name,
        phone=phone,
        needs_medical=needs_medical,
    )
    count = 0
    for recipient in settings.whatsapp_responder_list:
        outbox.enqueue("whatsapp", recipient, message)
        count += 1
    return count


def parse_resident_text(text: str) -> tuple[str, str, str | None]:
    lower = (text or "").lower()
    if "hazard" in lower or (("drain" in lower or "block" in lower) and "route" not in lower):
        action = "hazard"
    elif "route" in lower or "evac" in lower:
        action = "route"
    else:
        action = "sos"
    kind = "flood_trapped"
    mapping = [
        ("medical", "medical"),
        ("injur", "medical"),
        ("flood", "flood_trapped"),
        ("trapped", "flood_trapped"),
        ("fire", "collapse_fire"),
        ("collapse", "collapse_fire"),
        ("debris", "stuck_debris"),
        ("stuck", "stuck_location"),
        ("car", "car_flooding"),
        ("rising", "rising_water"),
        ("drain", "blocked_drainage"),
        ("structure", "damaged_structure"),
    ]
    for needle, value in mapping:
        if needle in lower:
            kind = value
            break
    if action == "hazard" and kind in {"flood_trapped", "medical", "collapse_fire", "stuck_debris", "stuck_location", "car_flooding"}:
        kind = "blocked_drainage"
    landmarks = {
        "line saba": "line-saba",
        "line-saba": "line-saba",
        "laini saba": "laini-saba",
        "laini-saba": "laini-saba",
        "silanga": "silanga",
        "olympic": "olympic",
        "highridge": "highridge",
        "community": "community-center",
        "drain": "main-drain-alley",
    }
    landmark = None
    for name, ident in landmarks.items():
        if name in lower:
            landmark = ident
            break
    return action, kind, landmark


def extract_cloud_messages(payload: dict) -> list[tuple[str, str, float | None, float | None]]:
    rows: list[tuple[str, str, float | None, float | None]] = []
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for msg in value.get("messages", []):
                sender = msg.get("from") or ""
                if sender and not sender.startswith("+"):
                    sender = f"+{sender}"
                text = ""
                lat = lon = None
                if msg.get("type") == "text":
                    text = (msg.get("text") or {}).get("body") or ""
                elif msg.get("type") == "location":
                    loc = msg.get("location") or {}
                    lat = loc.get("latitude")
                    lon = loc.get("longitude")
                    text = loc.get("name") or "SOS pin"
                else:
                    text = "SOS"
                rows.append((sender, text, lat, lon))
    return rows


def maybe_json(value: str | bytes | dict) -> dict | None:
    if isinstance(value, dict):
        return value
    try:
        return json.loads(value)
    except Exception:  # noqa: BLE001
        return None
