from fastapi import APIRouter, Depends, Request, status
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
    ConfirmDeleteAccountRequest,
    RequestDeleteAccountRequest,
    UpdateProfileRequest,
    UserActionResponse,
    UserResponse,
)
from app.shared.rate_limit import limit_account, limit_authenticated_request, limit_ip

router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer(auto_error=False)


async def get_current_user_dep(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserResponse:
    token = credentials.credentials if credentials else None
    user = await AuthController.get_current_user(token)
    await limit_authenticated_request(request, user.id)
    return user


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, request: Request):
    await limit_ip(request, "register", limit=5, window_seconds=3600)
    await limit_account("register", payload.email, limit=3, window_seconds=86400)
    return await AuthController.register(payload)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, request: Request):
    await limit_ip(request, "login", limit=20, window_seconds=60)
    await limit_account("login", payload.email, limit=10, window_seconds=900)
    return await AuthController.login(payload)


@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(payload: VerifyEmailRequest, request: Request):
    await limit_ip(request, "verify_email", limit=20, window_seconds=60)
    return await AuthController.verify_email(payload)


@router.post("/resend-verification", response_model=ResendVerificationResponse)
async def resend_verification(payload: ResendVerificationRequest, request: Request):
    await limit_ip(request, "verification_email", limit=5, window_seconds=3600)
    await limit_account("verification_email_cooldown", payload.email, limit=1, window_seconds=60)
    await limit_account("verification_email", payload.email, limit=3, window_seconds=3600)
    return await AuthController.resend_verification(payload)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(payload: ForgotPasswordRequest, request: Request):
    await limit_ip(request, "password_reset_email", limit=5, window_seconds=3600)
    await limit_account("password_reset_email_cooldown", payload.email, limit=1, window_seconds=60)
    await limit_account("password_reset_email", payload.email, limit=3, window_seconds=3600)
    return await AuthController.forgot_password(payload)


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(payload: ResetPasswordRequest, request: Request):
    await limit_ip(request, "password_reset", limit=10, window_seconds=60)
    return await AuthController.reset_password(payload)


@router.get("/me", response_model=UserResponse)
async def me(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials if credentials else None
    user = await AuthController.me(token)
    await limit_authenticated_request(request, user.id)
    return user


@router.post("/logout")
async def logout(current_user: UserResponse = Depends(get_current_user_dep)):
    return await AuthController.logout(current_user.id)


@router.get("/totp/status", response_model=TotpStatusResponse)
async def totp_status(request: Request, current_user: UserResponse = Depends(get_current_user_dep)):
    await limit_ip(request, "totp", limit=8, window_seconds=60)
    await limit_account("totp", current_user.id, limit=8, window_seconds=60)
    return await AuthController.totp_status(current_user.id)


@router.post("/totp/setup", response_model=TotpSetupResponse)
async def totp_setup(request: Request, current_user: UserResponse = Depends(get_current_user_dep)):
    await limit_ip(request, "totp", limit=8, window_seconds=60)
    await limit_account("totp", current_user.id, limit=8, window_seconds=60)
    return await AuthController.totp_setup(current_user.id)


@router.post("/totp/verify", response_model=TotpStatusResponse)
async def totp_verify(
    payload: TotpVerifyRequest,
    request: Request,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    await limit_ip(request, "totp", limit=8, window_seconds=60)
    await limit_account("totp", current_user.id, limit=8, window_seconds=60)
    return await AuthController.totp_verify(current_user.id, payload)


@router.post("/totp/disable", response_model=TotpStatusResponse)
async def totp_disable(
    payload: TotpDisableRequest,
    request: Request,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    await limit_ip(request, "totp", limit=8, window_seconds=60)
    await limit_account("totp", current_user.id, limit=8, window_seconds=60)
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
    request: Request,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    await limit_ip(request, "sensitive_auth", limit=30, window_seconds=900)
    await limit_account("sensitive_auth", current_user.id, limit=10, window_seconds=900)
    return await AuthController.change_password(current_user.id, payload)


@router.put("/email", response_model=UserActionResponse)
async def change_email(
    payload: ChangeEmailRequest,
    request: Request,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    await limit_ip(request, "sensitive_auth", limit=30, window_seconds=900)
    await limit_account("sensitive_auth", current_user.id, limit=10, window_seconds=900)
    return await AuthController.change_email(current_user.id, payload)


@router.put("/language", response_model=UserActionResponse)
async def change_language(
    payload: ChangeLanguageRequest,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    return await AuthController.change_language(current_user.id, payload)


@router.delete("/account", response_model=UserActionResponse)
async def request_delete_account(
    payload: RequestDeleteAccountRequest,
    request: Request,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    await limit_ip(request, "sensitive_auth", limit=30, window_seconds=900)
    await limit_account("sensitive_auth", current_user.id, limit=10, window_seconds=900)
    return await AuthController.request_delete_account(current_user.id, payload)


@router.post("/account/confirm-delete", response_model=UserActionResponse)
async def confirm_delete_account(payload: ConfirmDeleteAccountRequest, request: Request):
    await limit_ip(request, "confirm_delete_account", limit=5, window_seconds=3600)
    return await AuthController.confirm_delete_account(payload)


@router.get("/account/export")
async def export_user_data(
    current_user: UserResponse = Depends(get_current_user_dep),
):
    return await AuthController.export_user_data(current_user.id)




