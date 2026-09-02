import pytest
from app.config import Settings
from app.infrastructure.sms.adapter import AfricasTalkingSmsProvider, ConsoleSmsProvider, get_sms_provider


def test_settings_default_values():
    s = Settings()
    # env is set to "test" by conftest.py — just verify it's a non-empty string
    assert isinstance(s.env, str) and s.env
    assert s.africas_talking_username == "sandbox"
    assert s.is_sandbox is True
    assert s.africas_talking_sms_url == "https://api.sandbox.africastalking.com/version1/messaging"
    assert s.planner_auth_required is False
    assert s.is_production is False


def test_settings_alias_choices(monkeypatch):
    monkeypatch.setenv("AFRICAS_TALKING_API_KEY", "test_key_123")
    monkeypatch.setenv("AFRICAS_TALKING_USERNAME", "my_live_user")
    monkeypatch.setenv("PLANNER_API_KEY", "secret_planner_key")

    s = Settings()
    assert s.africas_talking_api_key == "test_key_123"
    assert s.africas_talking_username == "my_live_user"
    assert s.is_sandbox is False
    assert s.africas_talking_sms_url == "https://api.africastalking.com/version1/messaging"
    assert s.planner_api_key == "secret_planner_key"
    assert s.planner_auth_required is True


def test_sms_provider_factory(monkeypatch):
    # Disabled by default
    monkeypatch.setattr("app.config.settings.sms_enabled", False)
    monkeypatch.setattr("app.config.settings.africas_talking_api_key", "")
    provider = get_sms_provider()
    assert isinstance(provider, ConsoleSmsProvider)

    # Enabled with key
    monkeypatch.setattr("app.config.settings.sms_enabled", True)
    monkeypatch.setattr("app.config.settings.africas_talking_api_key", "at_key_xyz")
    provider = get_sms_provider()
    assert isinstance(provider, AfricasTalkingSmsProvider)
    assert provider.url == "https://api.sandbox.africastalking.com/version1/messaging"


def test_africastalking_provider_missing_key(monkeypatch):
    monkeypatch.setattr("app.config.settings.africas_talking_api_key", "")
    provider = AfricasTalkingSmsProvider()
    with pytest.raises(RuntimeError, match="Africa's Talking API key is not configured"):
        provider.send("+254700000000", "Test message")
