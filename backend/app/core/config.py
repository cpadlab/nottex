from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """
    Global configuration settings for the Nottex application.
    Loads configuration values from environment variables or .env file.
    """

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Nottex"
    APP_VERSION: str = "0.0.1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_PREFIX: str = "/api"

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"

    SECRET_KEY: str = "nottex-super-secret-key-change-in-production-random-32bytes"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    RESEND_VERIFICATION_COOLDOWN_MINUTES: int = 15
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour
    PASSWORD_RESET_COOLDOWN_MINUTES: int = 15  # 15 minutes between reset requests
    TOKEN_CLEANUP_INTERVAL_MINUTES: int = 60  # Background cleanup runs every hour

    CORS_ALLOW_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    CORS_EXPOSE_HEADERS: List[str] = ["*"]

    DATABASE_URL: str = "mongodb://localhost:27017"
    DATABASE_USERS_NAME: str = "users"
    DATABASE_NOTES_NAME: str = "notes"
    DATABASE_MAX_POOL_SIZE: int = 100
    DATABASE_MIN_POOL_SIZE: int = 10
    DATABASE_MAX_IDLE_TIME_MS: int = 30000
    DATABASE_WAIT_QUEUE_TIMEOUT_MS: int = 5000

    # Email / SMTP (Mailpit in development, SMTP / Email API provider in production)
    EMAILS_ENABLED: bool = True
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = False
    SMTP_SSL: bool = False
    SMTP_FROM_EMAIL: str = "noreply@nottex.com"
    SMTP_FROM_NAME: str = "Nottex"
    EMAIL_TEMPLATES_DIR: Path = BASE_DIR / "app" / "templates" / "email"


settings = Settings()