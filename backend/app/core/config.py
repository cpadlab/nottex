from pathlib import Path
from typing import List
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


settings = Settings()