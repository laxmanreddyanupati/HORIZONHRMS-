import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Horizon HRMS API (Python)"
    environment: str = os.getenv("ENVIRONMENT", "Development")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./horizon.db",
    )
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret-change-me-at-least-32-chars-long")
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_days: int = 7
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:80"]
    seed_enabled: bool = True
    seed_password: str = os.getenv("SEED_PASSWORD", "HorizonDev!2026")

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()