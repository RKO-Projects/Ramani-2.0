import re

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
