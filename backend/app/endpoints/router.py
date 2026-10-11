from fastapi import APIRouter
from app.endpoints.auth import router as auth_router
from app.endpoints.note import router as note_router
from app.endpoints.workspace import router as workspace_router

api_v1_router = APIRouter(prefix="/v1")
api_v1_router.include_router(auth_router)
api_v1_router.include_router(note_router)
api_v1_router.include_router(workspace_router)
