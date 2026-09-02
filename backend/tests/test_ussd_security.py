from app.infrastructure.ingestion.pipeline import normalize_phone, verify_ussd_webhook


def test_normalize_phone() -> None:
    assert normalize_phone("0700123456") == "+254700123456"


def test_verify_ussd_without_secret() -> None:
    assert verify_ussd_webhook("payload", None) is True
