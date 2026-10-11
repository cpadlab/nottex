from itertools import cycle
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.controllers.lifespan import lifespan
from app.endpoints.router import api_v1_router
from app.shared.database import db
from app.shared.logger import get_logger
from app.shared.request_limits import RequestBodyLimitMiddleware

logger = get_logger(__name__)

api = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    generate_unique_id_function=lambda route: route.name,
    lifespan=lifespan,
)

app = api

api.add_middleware(
    RequestBodyLimitMiddleware,
    max_bytes=settings.MAX_REQUEST_BODY_BYTES,
)

api.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOW_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
    expose_headers=settings.CORS_EXPOSE_HEADERS,
)

api.include_router(api_v1_router, prefix=settings.API_PREFIX)

pp_responses = cycle([
    {"ping": "pong"}, 
    {"pong": "ping"}
])


@api.get("/ping", tags=["Core"])
def pong():
    """
    Health check ping-pong endpoint.

    Returns alternating ping-pong responses to verify service responsiveness.

    Returns:
        dict: Alternating response dictionary.
    """
    return next(pp_responses)


@api.get("/ready", tags=["Core"])
async def readiness():
    """
    Return ready only after startup initialization and a live MongoDB ping.
    """
    if not getattr(api.state, "ready", False):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="service_not_ready",
        )

    try:
        await db.ping()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="database_unavailable",
        )

    return {"status": "ready"}
