from pathlib import Path
from typing import List, Optional
from urllib.parse import urlsplit
from pydantic import model_validator
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

    SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 60
    TOKEN_CLEANUP_INTERVAL_MINUTES: int = 60
    TRASH_RETENTION_DAYS: int = 30
    UNVERIFIED_USER_RETENTION_DAYS: int = 7


    CORS_ALLOW_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    CORS_ALLOW_HEADERS: List[str] = ["Authorization", "Content-Type", "Accept"]
    CORS_EXPOSE_HEADERS: List[str] = ["Retry-After"]

    DATABASE_URL: str = "mongodb://localhost:27017"
    DATABASE_USERS_NAME: str = "users"
    DATABASE_NOTES_NAME: str = "notes"
    DATABASE_MAX_POOL_SIZE: int = 100
    DATABASE_MIN_POOL_SIZE: int = 10
    DATABASE_MAX_IDLE_TIME_MS: int = 30000
    DATABASE_WAIT_QUEUE_TIMEOUT_MS: int = 5000

    MAX_COLLABORATORS_PER_NOTE: int = 50

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

    @model_validator(mode="after")
    def validate_security_settings(self):
        if not self.CORS_ALLOW_ORIGINS or "*" in self.CORS_ALLOW_ORIGINS:
            raise ValueError("CORS_ALLOW_ORIGINS must contain explicit origins and cannot contain '*'")
        if any("*" in value for value in self.CORS_ALLOW_METHODS + self.CORS_ALLOW_HEADERS + self.CORS_EXPOSE_HEADERS):
            raise ValueError("CORS methods and headers must be explicit; wildcards are not allowed")

        for origin in self.CORS_ALLOW_ORIGINS:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.path
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError(f"Invalid CORS origin: {origin!r}; specify only scheme and host")

        if self.ENVIRONMENT.lower() == "production":
            placeholder_markers = ("change-me", "replace-with", "example", "nottex")
            if len(self.SECRET_KEY) < 64 or any(marker in self.SECRET_KEY.lower() for marker in placeholder_markers):
                raise ValueError("SECRET_KEY must be at least 64 characters in production (generate with openssl rand -hex 32)")
            if not 1 <= self.ACCESS_TOKEN_EXPIRE_MINUTES <= 720:
                raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be between 1 and 720 in production")
            if self.DEBUG:
                raise ValueError("DEBUG must be false in production")
            if any(urlsplit(origin).scheme != "https" for origin in self.CORS_ALLOW_ORIGINS):
                raise ValueError("Production CORS origins must use HTTPS")
            if "localhost" in self.FRONTEND_URL or "127.0.0.1" in self.FRONTEND_URL:
                raise ValueError("FRONTEND_URL must not point to localhost in production")

        return self


settings = Settings()
