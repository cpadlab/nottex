import asyncio
from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings
from app.shared.database import db
from app.shared.logger import get_logger

logger = get_logger(__name__)


class TokenCleanupService:
    """
    Background worker service that removes expired temporal authentication tokens from users:
    - verification_token (email verification)
    - password_reset_token (forgot password requests)
    - delete_account_token (pending account deletion requests)
    """

    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._running: bool = False

    async def cleanup_expired_tokens(self) -> dict:
        """
        Executes a single cleanup run against the database:
        Finds documents where token expiry timestamp is older than current UTC time
        and nullifies both the token and its expiration field.
        """
        if not db.is_connected:
            logger.debug("Token cleanup skipped: database is not connected.")
            return {"status": "skipped", "reason": "db_not_connected"}

        now = datetime.now(timezone.utc)
        users_col = db.users["users"]

        verif_result = await users_col.update_many(
            {"verification_token_expires_at": {"$lt": now}},
            {
                "$set": {
                    "verification_token": None,
                    "verification_token_expires_at": None,
                    "updated_at": now,
                }
            },
        )

        reset_result = await users_col.update_many(
            {"password_reset_token_expires_at": {"$lt": now}},
            {
                "$set": {
                    "password_reset_token": None,
                    "password_reset_token_expires_at": None,
                    "updated_at": now,
                }
            },
        )

        delete_result = await users_col.update_many(
            {"delete_account_token_expires_at": {"$lt": now}},
            {
                "$set": {
                    "delete_account_token": None,
                    "delete_account_token_expires_at": None,
                    "updated_at": now,
                }
            },
        )

        cleaned_total = (
            verif_result.modified_count
            + reset_result.modified_count
            + delete_result.modified_count
        )

        if cleaned_total > 0:
            logger.info(
                f"Token cleanup finished: {cleaned_total} expired tokens cleared "
                f"(verification={verif_result.modified_count}, "
                f"reset={reset_result.modified_count}, "
                f"delete_account={delete_result.modified_count})."
            )

        return {
            "status": "success",
            "cleaned_total": cleaned_total,
            "verification_cleaned": verif_result.modified_count,
            "password_reset_cleaned": reset_result.modified_count,
            "delete_account_cleaned": delete_result.modified_count,
        }

    async def _cleanup_loop(self) -> None:
        """
        Continuous loop that executes cleanup at configured intervals.
        """
        interval_seconds = max(60, settings.TOKEN_CLEANUP_INTERVAL_MINUTES * 60)
        logger.info(
            f"Token cleanup background worker started (interval: {settings.TOKEN_CLEANUP_INTERVAL_MINUTES}m)."
        )

        while self._running:
            try:
                await self.cleanup_expired_tokens()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error occurred during background token cleanup: {e}")

            try:
                await asyncio.sleep(interval_seconds)
            except asyncio.CancelledError:
                break

        logger.info("Token cleanup background worker stopped.")

    def start(self) -> None:
        """
        Starts the background worker task if not already running.
        """
        if self._running or self._task is not None:
            return

        self._running = True
        self._task = asyncio.create_task(self._cleanup_loop())

    def stop(self) -> None:
        """
        Stops the background worker task cleanly.
        """
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
        self._task = None


token_cleanup_service = TokenCleanupService()

