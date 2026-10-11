from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.controllers.auth import AuthController
from app.schemas.auth import (
    AuthResponse,
    RegisterRequest,
    ResendVerificationRequest,
    ResendVerificationResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
)
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer(auto_error=False)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    return await AuthController.register(payload)


@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(payload: VerifyEmailRequest):
    return await AuthController.verify_email(payload)


@router.post("/resend-verification", response_model=ResendVerificationResponse)
async def resend_verification(payload: ResendVerificationRequest):
    return await AuthController.resend_verification(payload)


@router.get("/me", response_model=UserResponse)
async def me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials if credentials else None
    return await AuthController.me(token)
