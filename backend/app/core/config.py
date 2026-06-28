import os
from pathlib import Path
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# ----------------------------------------------------
# Environment detection
# ----------------------------------------------------

_app_env = os.environ.get("APP_ENV", "development").lower()

ENV_FILES = {
    "development": ".env.development",
    "production": ".env.production",
}

_env_file_name = ENV_FILES.get(_app_env)

if _env_file_name:
    _env_file_candidate = (
        Path(__file__).resolve().parent.parent.parent / _env_file_name
    )
    _env_file = (
        str(_env_file_candidate)
        if _env_file_candidate.is_file()
        else None
    )
else:
    # test / ci / staging etc.
    _env_file = None


class Settings(BaseSettings):
    # ----------------------------------------------------
    # App
    # ----------------------------------------------------

    APP_NAME: str = "NestinoKids API"
    APP_VERSION: str = "1.0.0"

    DEBUG: bool = False
    APP_ENV: str = "development"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str):
            value = value.strip().lower()

            if value in {"true", "1", "yes", "development", "debug", "dev"}:
                return True

            if value in {"false", "0", "no", "production", "prod", "release"}:
                return False

        return value

    # ----------------------------------------------------
    # Database
    # ----------------------------------------------------

    DATABASE_URL: str = ""

    # ----------------------------------------------------
    # JWT
    # ----------------------------------------------------

    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ----------------------------------------------------
    # CORS
    # ----------------------------------------------------

    ALLOWED_ORIGINS: str = (
        "http://localhost:3000,"
        "http://localhost:3001,"
        "http://localhost:5173"
    )

    # ----------------------------------------------------
    # Uploads
    # ----------------------------------------------------

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 5_242_880

    # ----------------------------------------------------
    # Razorpay
    # ----------------------------------------------------

    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # ----------------------------------------------------
    # Redis
    # ----------------------------------------------------

    REDIS_URL: str = "redis://localhost:6379"

    # ----------------------------------------------------
    # Email
    # ----------------------------------------------------

    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587

    SENDER_EMAIL: str = "noreply@nestinokids.com"
    SENDER_PASSWORD: str = ""

    # ----------------------------------------------------
    # URLs
    # ----------------------------------------------------

    FRONTEND_URL: str = "http://localhost:3000"
    ADMIN_URL: str = "http://localhost:3001"

    @property
    def ALLOWED_ORIGINS_LIST(self) -> List[str]:
        origins = [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]

        if self.ADMIN_URL and self.ADMIN_URL not in origins:
            origins.append(self.ADMIN_URL)

        return origins

    model_config = SettingsConfigDict(
        env_file=_env_file,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()