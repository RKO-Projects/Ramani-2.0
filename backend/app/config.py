from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="RAMANI_", extra="ignore")

    env: str = "development"
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    database_url: str = "sqlite:///./ramani.db"
    redis_url: str = "redis://localhost:6379/0"
    redis_enabled: bool = False
    planner_api_key: str = ""
    ussd_webhook_secret: str = ""
    hazard_penalty_ttl_hours: int = 24
    graph_stale_hours: int = 168
    sms_enabled: bool = False
    africas_talking_username: str = "sandbox"
    africas_talking_api_key: str = ""
    africas_talking_sms_sender: str = "RAMANI"
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


settings = Settings()
