import hashlib
import hmac
import re

from app.config import settings

PHONE_RE = re.compile(r"\+?\d{9,15}")


def redact_phone(value: str | None) -> str | None:
    if not value:
        return value
    return PHONE_RE.sub("[REDACTED]", value)


def redact_payload(payload: dict) -> dict:
    cleaned = dict(payload)
    if "phone" in cleaned:
        cleaned["phone"] = redact_phone(str(cleaned["phone"]))
    if "phoneNumber" in cleaned:
        cleaned["phoneNumber"] = redact_phone(str(cleaned["phoneNumber"]))
    return cleaned


def hash_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    secret = (settings.phone_hash_secret or "ramani-dev-hash").encode()
    return hmac.new(secret, phone.encode(), hashlib.sha256).hexdigest()[:32]


def mask_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 9:
        return "•••"
    cc, rest = digits[:3], digits[3:]
    return f"+{cc} {rest[0]}XX XXX {rest[-3:]}"


def cell_location_hash(landmark_id: str | None, settlement_id: str = "kibera") -> str:
    raw = f"{settlement_id}:{landmark_id or 'unknown'}"
    secret = (settings.phone_hash_secret or "ramani-dev-hash").encode()
    return "cell:" + hmac.new(secret, raw.encode(), hashlib.sha256).hexdigest()[:12]
