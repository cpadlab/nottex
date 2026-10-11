import hashlib
import hmac
import math
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Request, status
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.core.config import settings
from app.shared.database import db
from app.shared.logger import get_logger

logger = get_logger(__name__)


def _key(scope: str, identity: str) -> str:
    """
    Keep email addresses, user IDs, and IP addresses out of the rate-limit collection.
    """
    value = f"{scope}:{identity}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), value, hashlib.sha256).hexdigest()


def client_ip(request: Request) -> str:
    """
    Use the peer address resolved by Uvicorn's trusted-proxy middleware.
    """
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


async def enforce_rate_limit(
    scope: str,
    identity: str,
    *,
    limit: int,
    window_seconds: int,
    message: str = "error.rate_limit_exceeded",
) -> None:
    """
    Consume one token from a distributed bucket or raise HTTP 429.

    MongoDB update pipelines make token refill and consumption atomic across
    workers. Rejected requests do not drive the bucket below zero.
    """
    if not db.is_connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="error.database_unavailable",
        )

    bucket_key = _key(scope, identity)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=max(window_seconds * 2, 3600))
    refill_per_second = limit / window_seconds

    refilled_tokens = {
        "$min": [
            limit,
            {
                "$add": [
                    {"$ifNull": ["$tokens", limit]},
                    {
                        "$multiply": [
                            {
                                "$max": [
                                    0,
                                    {
                                        "$divide": [
                                            {
                                                "$subtract": [
                                                    now,
                                                    {"$ifNull": ["$updated_at", now]},
                                                ]
                                            },
                                            1000,
                                        ]
                                    },
                                ]
                            },
                            refill_per_second,
                        ]
                    },
                ]
            },
        ]
    }
    pipeline = [
        {"$set": {"_refilled_tokens": refilled_tokens}},
        {
            "$set": {
                "tokens": {"$max": [0, {"$subtract": ["$_refilled_tokens", 1]}]},
                "allowed": {"$gte": ["$_refilled_tokens", 1]},
                "updated_at": now,
                "expires_at": expires_at,
            }
        },
        {"$unset": "_refilled_tokens"},
    ]

    collection = db.users["rate_limits"]
    try:
        try:
            result = await collection.find_one_and_update(
                {"_id": bucket_key},
                pipeline,
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError:
            result = await collection.find_one_and_update(
                {"_id": bucket_key},
                pipeline,
                upsert=False,
                return_document=ReturnDocument.AFTER,
            )
    except PyMongoError as exc:
        logger.error("Rate-limit storage operation failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="error.rate_limit_unavailable",
        ) from exc

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="error.rate_limit_unavailable",
        )

    if not result.get("allowed", False):
        retry_after = max(1, math.ceil(window_seconds / limit))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=message,
            headers={"Retry-After": str(retry_after)},
        )


async def limit_ip(
    request: Request,
    scope: str,
    *,
    limit: int,
    window_seconds: int,
) -> None:
    await enforce_rate_limit(
        f"{scope}:ip",
        client_ip(request),
        limit=limit,
        window_seconds=window_seconds,
    )


async def limit_account(
    scope: str,
    identity: str,
    *,
    limit: int,
    window_seconds: int,
) -> None:
    await enforce_rate_limit(
        f"{scope}:account",
        identity.strip().lower(),
        limit=limit,
        window_seconds=window_seconds,
    )


async def limit_authenticated_request(request: Request, user_id: str) -> None:
    await limit_ip(request, "authenticated", limit=300, window_seconds=60)
    await limit_account(
        "authenticated",
        user_id,
        limit=180,
        window_seconds=60,
    )
