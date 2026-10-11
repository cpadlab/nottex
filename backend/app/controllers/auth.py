import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core.config import settings
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
from app.schemas.user import UserResponse
from app.shared.database import db
from app.shared.emailer import emailer
from app.shared.logger import get_logger
from app.shared.security import (
    create_access_token,
    decode_access_token,
    generate_totp_secret,
    generate_verification_token,
    get_totp_uri,
    hash_password,
    verify_password,
    verify_totp_code,
)

logger = get_logger(__name__)


async def send_verification_email_task(
    email: str,
    first_name: str,
    token: str,
    language: str = "es",
) -> None:
    """
    Background worker task to dispatch unstyled verification email based on user language.
    """
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    is_en = language.lower().startswith("en")
    template_name = "en/verify_email.html" if is_en else "es/verify_email.html"
    subject = (
        f"Verify your {settings.APP_NAME} account"
        if is_en
        else f"Verifica tu cuenta en {settings.APP_NAME}"
    )

    try:
        await emailer.send_email(
            to=email,
            subject=subject,
            template_name=template_name,
            context={
                "app_name": settings.APP_NAME,
                "first_name": first_name.capitalize(),
                "verification_url": verification_url,
                "token": token,
            },
        )
    except Exception as e:
        logger.error(f"Error sending verification email to {email}: {e}")


async def send_reset_password_email_task(
    email: str,
    first_name: str,
    token: str,
    language: str = "es",
) -> None:
    """
    Background worker task to dispatch password reset email based on user language.
    """
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    is_en = language.lower().startswith("en")
    template_name = "en/reset_password.html" if is_en else "es/reset_password.html"
    subject = (
        f"Reset your {settings.APP_NAME} password"
        if is_en
        else f"Restablece tu contraseña en {settings.APP_NAME}"
    )

    try:
        await emailer.send_email(
            to=email,
            subject=subject,
            template_name=template_name,
            context={
                "app_name": settings.APP_NAME,
                "first_name": first_name.capitalize(),
                "reset_url": reset_url,
                "token": token,
            },
        )
    except Exception as e:
        logger.error(f"Error sending password reset email to {email}: {e}")


async def send_password_changed_email_task(
    email: str,
    first_name: str,
    language: str = "es",
) -> None:
    """
    Background worker task to notify user that their password was changed.
    """
    is_en = language.lower().startswith("en")
    template_name = "en/password_changed.html" if is_en else "es/password_changed.html"
    subject = (
        f"Your {settings.APP_NAME} password was changed"
        if is_en
        else f"Tu contraseña en {settings.APP_NAME} ha sido cambiada"
    )

    try:
        await emailer.send_email(
            to=email,
            subject=subject,
            template_name=template_name,
            context={
                "app_name": settings.APP_NAME,
                "first_name": first_name.capitalize(),
            },
        )
    except Exception as e:
        logger.error(f"Error sending password changed email to {email}: {e}")


class AuthController:
    """
    Controller that contains the business logic for authentication and user verification.
    """

    @staticmethod
    async def register(payload: RegisterRequest) -> AuthResponse:
        """
        Handles user registration logic:
        - Checks database availability and email uniqueness
        - Hashes password with Argon2id
        - Generates UUID and verification token
        - Inserts user document
        - Spawns background asyncio task to send verification email
        - Generates JWT access token and returns AuthResponse
        """
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )

        users_collection = db.users["users"]

        existing_user = await users_collection.find_one({"email": payload.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="error.email_already_registered",
            )

        hashed_pwd = hash_password(payload.password)

        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        token = generate_verification_token()
        token_expires_at = now + timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS)

        user_doc = {
            "_id": user_id,
            "id": user_id,
            "email": payload.email,
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "language": payload.language,
            "hashed_password": hashed_pwd,
            "is_verified": False,
            "verification_token": token,
            "verification_token_expires_at": token_expires_at,
            "verification_email_sent_at": now,
            "last_login": now,
            "created_at": now,
            "updated_at": now,
        }

        try:
            await users_collection.insert_one(user_doc)
        except DuplicateKeyError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="error.email_already_registered",
            )

        asyncio.create_task(
            send_verification_email_task(
                email=payload.email,
                first_name=payload.first_name,
                token=token,
                language=payload.language,
            )
        )

        access_token = create_access_token(
            data={"sub": user_id, "email": payload.email}
        )

        user_response = UserResponse(
            id=user_id,
            email=payload.email,
            first_name=payload.first_name,
            last_name=payload.last_name,
            language=payload.language,
            is_verified=False,
            is_totp_enabled=False,
            last_login=now,
            created_at=now,
            updated_at=now,
        )

        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_response,
            message="auth.register_success",
        )

    @staticmethod
    async def verify_email(payload: VerifyEmailRequest) -> VerifyEmailResponse:
        """
        Handles email verification logic:
        - Validates temporal token
        - Checks token expiration
        - Updates user status to verified and invalidates token
        """
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )

        users_collection = db.users["users"]

        user = await users_collection.find_one({"verification_token": payload.token})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="error.invalid_or_used_token",
            )

        if user.get("is_verified") is True:
            return VerifyEmailResponse(
                message="auth.email_already_verified",
                is_verified=True,
            )

        expires_at = user.get("verification_token_expires_at")
        if expires_at:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expires_at:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="error.token_expired",
                )

        now = datetime.now(timezone.utc)
        await users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "is_verified": True,
                    "verification_token": None,
                    "verification_token_expires_at": None,
                    "updated_at": now,
                }
            },
        )

        logger.info(f"User email verified successfully: {user.get('email')}")
        return VerifyEmailResponse(
            message="auth.email_verified_success",
            is_verified=True,
        )

    @staticmethod
    async def resend_verification(payload: ResendVerificationRequest) -> ResendVerificationResponse:
        """
        Handles resending verification email logic:
        - Verifies user exists and email is not yet verified
        - Enforces 15-minute cooldown between requests
        - Generates new token and dispatches email via asyncio background task
        """
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )

        users_collection = db.users["users"]

        user = await users_collection.find_one({"email": payload.email})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.user_not_found",
            )

        if user.get("is_verified") is True:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="error.email_already_verified",
            )

        last_sent = user.get("verification_email_sent_at")
        if last_sent:
            if last_sent.tzinfo is None:
                last_sent = last_sent.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            elapsed = now - last_sent
            cooldown = timedelta(minutes=settings.RESEND_VERIFICATION_COOLDOWN_MINUTES)
            if elapsed < cooldown:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="error.resend_cooldown_active",
                )

        now = datetime.now(timezone.utc)
        token = generate_verification_token()
        token_expires_at = now + timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS)

        await users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "verification_token": token,
                    "verification_token_expires_at": token_expires_at,
                    "verification_email_sent_at": now,
                    "updated_at": now,
                }
            },
        )

        first_name = user.get("first_name", "")
        language = user.get("language", "es")
        asyncio.create_task(
            send_verification_email_task(
                email=payload.email,
                first_name=first_name,
                token=token,
                language=language,
            )
        )

        return ResendVerificationResponse(
            message="auth.verification_email_sent",
        )

    @staticmethod
    async def get_current_user(token: Optional[str]) -> UserResponse:
        """
        Validates JWT token from authorization header, retrieves user from MongoDB,
        and returns the user profile.
        """
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="error.unauthorized",
                headers={"WWW-Authenticate": "Bearer"},
            )

        payload = decode_access_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="error.token_invalid_or_expired",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="error.unauthorized",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )

        users_collection = db.users["users"]
        user = await users_collection.find_one({"_id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.user_not_found",
            )

        return UserResponse(
            id=user["id"],
            email=user["email"],
            first_name=user["first_name"],
            last_name=user["last_name"],
            language=user.get("language", "es"),
            is_verified=user.get("is_verified", False),
            is_totp_enabled=user.get("is_totp_enabled", False),
            last_login=user.get("last_login"),
            created_at=user.get("created_at"),
            updated_at=user.get("updated_at"),
        )

    @staticmethod
    async def me(token: Optional[str]) -> UserResponse:
        """
        Returns the profile of the currently authenticated user.
        """
        return await AuthController.get_current_user(token)

    @staticmethod
    async def forgot_password(payload: ForgotPasswordRequest) -> ForgotPasswordResponse:
        """
        Initiates password recovery:
        - Checks database connection
        - Finds user by normalized email
        - Enforces rate limiting cooldown (15 minutes between recovery requests)
        - Generates temporal reset token (expires in 60 minutes)
        - Dispatches localized email with reset link in background via asyncio
        - Returns success message without leaking existence for security
        """
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )

        users_collection = db.users["users"]
        user = await users_collection.find_one({"email": payload.email})

        if not user:
            return ForgotPasswordResponse(
                message="auth.forgot_password_email_sent",
            )

        last_requested = user.get("password_reset_sent_at")
        if last_requested:
            if last_requested.tzinfo is None:
                last_requested = last_requested.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            elapsed = now - last_requested
            cooldown = timedelta(minutes=settings.PASSWORD_RESET_COOLDOWN_MINUTES)
            if elapsed < cooldown:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="error.resend_cooldown_active",
                )

        now = datetime.now(timezone.utc)
        token = generate_verification_token()
        token_expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

        await users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_reset_token": token,
                    "password_reset_token_expires_at": token_expires_at,
                    "password_reset_sent_at": now,
                    "updated_at": now,
                }
            },
        )

        first_name = user.get("first_name", "")
        language = user.get("language", "es")
        asyncio.create_task(
            send_reset_password_email_task(
                email=payload.email,
                first_name=first_name,
                token=token,
                language=language,
            )
        )

        return ForgotPasswordResponse(
            message="auth.forgot_password_email_sent",
        )

    @staticmethod
    async def reset_password(payload: ResetPasswordRequest) -> ResetPasswordResponse:
        """
        Completes password reset:
        - Validates reset token existence and expiry
        - Hashes new password with Argon2id
        - Invalidates the reset token
        - Updates password in database
        - Dispatches confirmation email to notify user that password has changed
        """
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )

        users_collection = db.users["users"]
        user = await users_collection.find_one({"password_reset_token": payload.token})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="error.invalid_or_used_token",
            )

        expires_at = user.get("password_reset_token_expires_at")
        if expires_at:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expires_at:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="error.token_expired",
                )

        hashed_pwd = hash_password(payload.new_password)
        now = datetime.now(timezone.utc)

        await users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "hashed_password": hashed_pwd,
                    "password_reset_token": None,
                    "password_reset_token_expires_at": None,
                    "updated_at": now,
                }
            },
        )

        logger.info(f"Password reset successfully for user: {user.get('email')}")

        first_name = user.get("first_name", "")
        language = user.get("language", "es")
        asyncio.create_task(
            send_password_changed_email_task(
                email=user["email"],
                first_name=first_name,
                language=language,
            )
        )

        return ResetPasswordResponse(
            message="auth.password_reset_success",
        )

    @staticmethod
    async def login(payload: LoginRequest) -> AuthResponse:
        """
        Authenticates a user:
        - Validates credentials
        - If TOTP is enabled:
          - If totp_code is missing: returns requires_totp=True (so client prompts for 6-digit code)
          - If totp_code is provided: validates code against user's stored totp_secret
        - Updates last_login timestamp and returns JWT token
        """
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )

        users_collection = db.users["users"]
        user = await users_collection.find_one({"email": payload.email})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="error.invalid_credentials",
            )

        if not verify_password(payload.password, user.get("hashed_password", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="error.invalid_credentials",
            )

        is_totp_enabled = user.get("is_totp_enabled", False)
        totp_secret = user.get("totp_secret")

        if is_totp_enabled and totp_secret:
            if not payload.totp_code:
                return AuthResponse(
                    access_token=None,
                    token_type="bearer",
                    user=None,
                    requires_totp=True,
                    message="auth.totp_code_required",
                )

            if not verify_totp_code(totp_secret, payload.totp_code):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="error.invalid_totp_code",
                )

        now = datetime.now(timezone.utc)
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": now, "updated_at": now}},
        )

        user_id = user["id"]
        access_token = create_access_token(
            data={"sub": user_id, "email": user["email"]}
        )

        user_response = UserResponse(
            id=user_id,
            email=user["email"],
            first_name=user["first_name"],
            last_name=user["last_name"],
            language=user.get("language", "es"),
            is_verified=user.get("is_verified", False),
            is_totp_enabled=is_totp_enabled,
            last_login=now,
            created_at=user.get("created_at"),
            updated_at=now,
        )

        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_response,
            requires_totp=False,
            message="auth.login_success",
        )

    @staticmethod
    async def totp_setup(user_id: str) -> TotpSetupResponse:
        """
        Initiates 2FA setup:
        - Generates a secret key and provisioning URI (for Google Authenticator, Authy, etc.)
        - Stores the pending secret in user document until verified
        """
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )

        users_collection = db.users["users"]
        user = await users_collection.find_one({"_id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.user_not_found",
            )

        secret = generate_totp_secret()
        uri = get_totp_uri(secret=secret, email=user["email"])

        now = datetime.now(timezone.utc)
        await users_collection.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "pending_totp_secret": secret,
                    "updated_at": now,
                }
            },
        )

        return TotpSetupResponse(
            secret=secret,
            provisioning_uri=uri,
        )

    @staticmethod
    async def totp_verify(user_id: str, payload: TotpVerifyRequest) -> TotpStatusResponse:
        """
        Confirms and activates TOTP:
        - Validates the 6-digit code against the pending secret
        - Sets is_totp_enabled=True and promotes pending_totp_secret to totp_secret
        """
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )

        users_collection = db.users["users"]
        user = await users_collection.find_one({"_id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.user_not_found",
            )

        pending_secret = user.get("pending_totp_secret")
        if not pending_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="error.no_pending_totp_setup",
            )

        if not verify_totp_code(pending_secret, payload.code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="error.invalid_totp_code",
            )

        now = datetime.now(timezone.utc)
        await users_collection.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "is_totp_enabled": True,
                    "totp_secret": pending_secret,
                    "pending_totp_secret": None,
                    "updated_at": now,
                }
            },
        )

        logger.info(f"TOTP 2FA enabled successfully for user {user.get('email')}")
        return TotpStatusResponse(is_enabled=True)

    @staticmethod
    async def totp_disable(user_id: str, payload: TotpDisableRequest) -> TotpStatusResponse:
        """
        Disables TOTP 2FA:
        - Requires verification via password or valid totp_code for security
        - Clears totp_secret and sets is_totp_enabled=False
        """
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )

        users_collection = db.users["users"]
        user = await users_collection.find_one({"_id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.user_not_found",
            )

        if not user.get("is_totp_enabled"):
            return TotpStatusResponse(is_enabled=False)

        authenticated = False
        if payload.password and verify_password(payload.password, user.get("hashed_password", "")):
            authenticated = True
        elif payload.code and user.get("totp_secret") and verify_totp_code(user["totp_secret"], payload.code):
            authenticated = True

        if not authenticated:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="error.totp_disable_auth_failed",
            )

        now = datetime.now(timezone.utc)
        await users_collection.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "is_totp_enabled": False,
                    "totp_secret": None,
                    "pending_totp_secret": None,
                    "updated_at": now,
                }
            },
        )

        logger.info(f"TOTP 2FA disabled for user {user.get('email')}")
        return TotpStatusResponse(is_enabled=False)

    @staticmethod
    async def totp_status(user_id: str) -> TotpStatusResponse:
        """
        Returns whether TOTP 2FA is currently active for the user.
        """
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )

        users_collection = db.users["users"]
        user = await users_collection.find_one({"_id": user_id}, {"is_totp_enabled": 1})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.user_not_found",
            )

        return TotpStatusResponse(is_enabled=user.get("is_totp_enabled", False))



