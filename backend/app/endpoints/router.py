from fastapi import APIRouter
from app.endpoints.auth import router as auth_router

api_v1_router = APIRouter(prefix="/v1")
api_v1_router.include_router(auth_router)
