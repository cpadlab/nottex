from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.shared.cleanup import token_cleanup_service
from app.shared.logger import get_logger
from app.shared.database import db
from app.core.config import settings

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Handles application startup and shutdown lifecycle events.
    Initializes database connection pool and background services on startup and closes them on shutdown.
    """
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} [{settings.ENVIRONMENT}]...")
    
    try:
        await db.connect()
        await db.users["users"].create_index("email", unique=True)
        await db.notes["workspaces"].create_index([("user_id", 1), ("parent_id", 1)])
        await db.notes["notes"].create_index([("user_id", 1), ("workspace_id", 1)])
        token_cleanup_service.start()
    except Exception as e:
        logger.warning(f"Database connection or index creation failed during startup: {e}. Continuing in degraded mode.")

    yield

    logger.info(f"Shutting down {settings.APP_NAME}...")
    try:
        token_cleanup_service.stop()
    except Exception as e:
        logger.error(f"Error while stopping token cleanup service: {e}")

    try:
        db.close()
    except Exception as e:
        logger.error(f"Error while closing database connection: {e}")