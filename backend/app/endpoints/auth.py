from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.controllers.auth import AuthController
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResendVerificationResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    TotpDisableRequest,
    TotpSetupResponse,
    TotpStatusResponse,
    TotpVerifyRequest,
    VerifyEmailRequest,
    VerifyEmailResponse,
)
from app.schemas.user import (
    ChangeEmailRequest,
    ChangeLanguageRequest,
    ChangePasswordRequest,
    UpdateProfileRequest,
    UserActionResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer(auto_error=False)


async def get_current_user_dep(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserResponse:
    token = credentials.credentials if credentials else None
    return await AuthController.get_current_user(token)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    return await AuthController.register(payload)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    return await AuthController.login(payload)


@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(payload: VerifyEmailRequest):
    return await AuthController.verify_email(payload)


@router.post("/resend-verification", response_model=ResendVerificationResponse)
async def resend_verification(payload: ResendVerificationRequest):
    return await AuthController.resend_verification(payload)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(payload: ForgotPasswordRequest):
    return await AuthController.forgot_password(payload)


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(payload: ResetPasswordRequest):
    return await AuthController.reset_password(payload)


@router.get("/me", response_model=UserResponse)
async def me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials if credentials else None
    return await AuthController.me(token)


@router.get("/totp/status", response_model=TotpStatusResponse)
async def totp_status(current_user: UserResponse = Depends(get_current_user_dep)):
    return await AuthController.totp_status(current_user.id)


@router.post("/totp/setup", response_model=TotpSetupResponse)
async def totp_setup(current_user: UserResponse = Depends(get_current_user_dep)):
    return await AuthController.totp_setup(current_user.id)


@router.post("/totp/verify", response_model=TotpStatusResponse)
async def totp_verify(
    payload: TotpVerifyRequest,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    return await AuthController.totp_verify(current_user.id, payload)


@router.post("/totp/disable", response_model=TotpStatusResponse)
async def totp_disable(
    payload: TotpDisableRequest,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    return await AuthController.totp_disable(current_user.id, payload)


@router.put("/profile", response_model=UserActionResponse)
async def update_profile(
    payload: UpdateProfileRequest,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    return await AuthController.update_profile(current_user.id, payload)


@router.put("/password", response_model=UserActionResponse)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    return await AuthController.change_password(current_user.id, payload)


@router.put("/email", response_model=UserActionResponse)
async def change_email(
    payload: ChangeEmailRequest,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    return await AuthController.change_email(current_user.id, payload)


@router.put("/language", response_model=UserActionResponse)
async def change_language(
    payload: ChangeLanguageRequest,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    return await AuthController.change_language(current_user.id, payload)


