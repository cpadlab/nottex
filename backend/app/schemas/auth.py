import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.schemas.user import UserResponse


class RegisterRequest(BaseModel):
    email: EmailStr
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)
    language: str = Field(default="es", max_length=10)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("language", mode="before")
    @classmethod
    def normalize_language(cls, v: str) -> str:
        if isinstance(v, str):
            lang = v.strip().lower()
            return "en" if lang.startswith("en") else "es"
        return "es"

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("error.password_too_short")
        if not re.search(r"[A-Z]", v):
            raise ValueError("error.password_no_uppercase")
        if not re.search(r"[a-z]", v):
            raise ValueError("error.password_no_lowercase")
        if not re.search(r"[0-9\W_]", v):
            raise ValueError("error.password_no_special_or_digit")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = Field(default=None, min_length=6, max_length=64)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class AuthResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[UserResponse] = None
    requires_totp: bool = False
    session_id: Optional[str] = None
    message: str = "auth.register_success"


class TotpSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str


class TotpVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class TotpDisableRequest(BaseModel):
    password: Optional[str] = None
    code: Optional[str] = None


class TotpStatusResponse(BaseModel):
    is_enabled: bool
    recovery_codes: Optional[list[str]] = None


class SessionResponse(BaseModel):
    id: str
    created_at: datetime
    expires_at: datetime


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]
    current_session_id: Optional[str] = None


class TotpRecoveryCodesRequest(BaseModel):
    password: Optional[str] = None
    code: Optional[str] = Field(default=None, min_length=6, max_length=64)


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=10)


class VerifyEmailResponse(BaseModel):
    message: str = "auth.email_verified_success"
    is_verified: bool = True


class ResendVerificationRequest(BaseModel):
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class ResendVerificationResponse(BaseModel):
    message: str = "auth.verification_email_sent"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class ForgotPasswordResponse(BaseModel):
    message: str = "auth.forgot_password_email_sent"


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10)
    new_password: str = Field(min_length=8, max_length=128, description="Nueva contraseña segura")

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("error.password_too_short")
        if not re.search(r"[A-Z]", v):
            raise ValueError("error.password_no_uppercase")
        if not re.search(r"[a-z]", v):
            raise ValueError("error.password_no_lowercase")
        if not re.search(r"[0-9\W_]", v):
            raise ValueError("error.password_no_special_or_digit")
        return v


class ResetPasswordResponse(BaseModel):
    message: str = "auth.password_reset_success"


