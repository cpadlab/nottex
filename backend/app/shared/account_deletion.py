import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from pymongo import ReturnDocument

from app.shared.database import db
from app.shared.logger import get_logger

logger = get_logger(__name__)
LEASE_DURATION = timedelta(minutes=10)


async def process_account_deletion(user_id: str) -> Optional[dict[str, Any]]:
    """
    Claim one pending deletion, perform idempotent steps, and delete the user last.

    Returns the pre-deletion user document when this worker completed the deletion,
    or None when another worker owns the lease / the user is no longer queued.
    """
    users_col = db.users["users"]
    now = datetime.now(timezone.utc)
    lease_id = str(uuid.uuid4())
    claimed = await users_col.find_one_and_update(
        {
            "_id": user_id,
            "account_deletion_status": {"$in": ["pending", "processing"]},
            "$or": [
                {"account_deletion_lease_until": {"$exists": False}},
                {"account_deletion_lease_until": None},
                {"account_deletion_lease_until": {"$lt": now}},
            ],
        },
        {
            "$set": {
                "account_deletion_status": "processing",
                "account_deletion_lease_id": lease_id,
                "account_deletion_lease_until": now + LEASE_DURATION,
                "account_deletion_last_attempt_at": now,
            },
            "$inc": {"account_deletion_attempts": 1},
        },
        return_document=ReturnDocument.AFTER,
    )
    if not claimed:
        return None

    notes_col = db.notes["notes"]
    workspaces_col = db.notes["workspaces"]

    async def set_stage(stage: str) -> None:
        await users_col.update_one(
            {"_id": user_id, "account_deletion_lease_id": lease_id},
            {"$set": {"account_deletion_stage": stage}},
        )

    try:
        await workspaces_col.delete_many({"user_id": user_id})
        await set_stage("workspaces_deleted")

        await notes_col.update_many(
            {"collaborators.user_id": user_id},
            {"$pull": {"collaborators": {"user_id": user_id}}},
        )
        await set_stage("collaborators_removed")

        await notes_col.delete_many({"user_id": user_id})
        await set_stage("owned_notes_deleted")

        deleted = await users_col.delete_one(
            {"_id": user_id, "account_deletion_lease_id": lease_id}
        )
        if deleted.deleted_count != 1:
            return None
        logger.info(
            "Account deletion completed",
            extra={"user_id": user_id, "attempt": claimed.get("account_deletion_attempts")},
        )
        return claimed
    except Exception as exc:
        try:
            await users_col.update_one(
                {"_id": user_id, "account_deletion_lease_id": lease_id},
                {
                    "$set": {
                        "account_deletion_status": "pending",
                        "account_deletion_last_error": str(exc)[:1000],
                        "account_deletion_last_failed_at": datetime.now(timezone.utc),
                    },
                    "$unset": {"account_deletion_lease_id": "", "account_deletion_lease_until": ""},
                },
            )
        except Exception:
            logger.exception("Could not persist account deletion retry state", extra={"user_id": user_id})
        logger.exception(
            "Account deletion failed; job retained for retry",
            extra={
                "user_id": user_id,
                "stage": claimed.get("account_deletion_stage"),
                "attempt": claimed.get("account_deletion_attempts"),
            },
        )
        if claimed.get("account_deletion_attempts", 0) >= 5:
            logger.critical(
                "Account deletion has failed at least five times and needs operator attention",
                extra={"user_id": user_id, "stage": claimed.get("account_deletion_stage")},
            )
        raise
