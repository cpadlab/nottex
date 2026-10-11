from fastapi import APIRouter, status

from app.controllers.auth import AuthController
from app.schemas.auth import (
    AuthResponse,
    RegisterRequest,
    ResendVerificationRequest,
    ResendVerificationResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    return await AuthController.register(payload)


@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(payload: VerifyEmailRequest):
    return await AuthController.verify_email(payload)


@router.post("/resend-verification", response_model=ResendVerificationResponse)
async def resend_verification(payload: ResendVerificationRequest):
    return await AuthController.resend_verification(payload)
