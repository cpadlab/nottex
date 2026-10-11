from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.shared.cleanup import token_cleanup_service
from app.shared.logger import get_logger
from app.shared.database import db
from app.shared.security import migrate_legacy_totp_secrets, migrate_legacy_note_fields
from app.core.config import settings

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Handles application startup and shutdown lifecycle events.
    Initializes database connection pool and background services on startup and closes them on shutdown.
    """
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} [{settings.ENVIRONMENT}]...")
    app.state.ready = False

    try:
        await db.connect()
        await migrate_legacy_totp_secrets(db.users["users"])
        await migrate_legacy_note_fields(db.notes["notes"])
        await db.users["users"].create_index("email", unique=True)
        for token_field in ("verification_token", "password_reset_token", "delete_account_token"):
            await db.users["users"].create_index(
                [(token_field, 1)],
                name=f"{token_field}_lookup",
                partialFilterExpression={token_field: {"$type": "string"}},
            )
        await db.users["users"].create_index(
            [("account_deletion_status", 1), ("account_deletion_lease_until", 1)]
        )
        await db.users["rate_limits"].create_index("expires_at", expireAfterSeconds=0)
        
        await db.notes["workspaces"].create_index([("user_id", 1), ("parent_id", 1)])
        await db.notes["workspaces"].create_index(
            [("user_id", 1), ("created_at", 1)], name="workspace_owner_created"
        )
        await db.notes["notes"].create_index(
            [("user_id", 1), ("workspace_id", 1), ("updated_at", -1)],
            name="note_owner_workspace_updated",
        )
        await db.notes["notes"].create_index(
            [("user_id", 1), ("is_trashed", 1), ("workspace_id", 1), ("updated_at", -1)],
            name="note_owner_trash_workspace_updated",
        )
        await db.notes["notes"].create_index(
            [("collaborators.user_id", 1), ("workspace_id", 1), ("updated_at", -1)],
            name="note_collaborator_workspace_updated",
        )
        await db.notes["notes"].create_index(
            [("user_id", 1), ("is_trashed", 1), ("trashed_at", 1)],
            name="note_owner_trash_date",
        )
        token_cleanup_service.start()
    except Exception as e:
        token_cleanup_service.stop()
        db.close()
        if settings.ENVIRONMENT.lower() == "production":
            logger.exception("Database initialization failed; refusing to start in production.")
            raise
        logger.warning(f"Database initialization failed; starting unready in development: {e}")
    else:
        app.state.ready = True

    yield

    logger.info(f"Shutting down {settings.APP_NAME}...")
    app.state.ready = False
    try:
        token_cleanup_service.stop()
    except Exception as e:
        logger.error(f"Error while stopping token cleanup service: {e}")

    try:
        db.close()
    except Exception as e:
        logger.error(f"Error while closing database connection: {e}")
