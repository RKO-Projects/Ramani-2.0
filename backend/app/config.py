from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="RAMANI_", extra="ignore")

    env: str = "development"
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    database_url: str = Field(
        default="sqlite:///./ramani.db",
        validation_alias=AliasChoices("RAMANI_DATABASE_URL", "DATABASE_URL"),
    )
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        validation_alias=AliasChoices("RAMANI_REDIS_URL", "REDIS_URL"),
    )
    redis_enabled: bool = False
    planner_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("RAMANI_PLANNER_API_KEY", "PLANNER_API_KEY"),
    )
    ussd_webhook_secret: str = Field(
        default="",
        validation_alias=AliasChoices("RAMANI_USSD_WEBHOOK_SECRET", "USSD_WEBHOOK_SECRET"),
    )
    hazard_penalty_ttl_hours: int = 24
    graph_stale_hours: int = 168
    sms_enabled: bool = False
    africas_talking_username: str = Field(
        default="sandbox",
        validation_alias=AliasChoices("RAMANI_AFRICAS_TALKING_USERNAME", "AFRICAS_TALKING_USERNAME"),
    )
    africas_talking_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("RAMANI_AFRICAS_TALKING_API_KEY", "AFRICAS_TALKING_API_KEY"),
    )
    africas_talking_sms_sender: str = Field(
        default="RAMANI",
        validation_alias=AliasChoices("RAMANI_AFRICAS_TALKING_SMS_SENDER", "AFRICAS_TALKING_SMS_SENDER"),
    )
    default_settlement: str = "kibera"
    log_level: str = "INFO"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def planner_auth_required(self) -> bool:
        return bool(self.planner_api_key)

    @property
    def is_sandbox(self) -> bool:
        return self.africas_talking_username.lower() == "sandbox"

    @property
    def africas_talking_sms_url(self) -> str:
        if self.is_sandbox:
            return "https://api.sandbox.africastalking.com/version1/messaging"
        return "https://api.africastalking.com/version1/messaging"

    @property
    def is_production(self) -> bool:
        return self.env.lower() == "production"


settings = Settings()

