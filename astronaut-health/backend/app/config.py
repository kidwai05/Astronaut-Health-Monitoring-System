from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Astronaut Health Monitoring API"
    database_url: str = "sqlite:///./astronaut_health.db"
    nasa_api_key: str = "DEMO_KEY"
    baseline_days: int = 7  # first N days used to compute a personal baseline
    cors_origins: list[str] = ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
