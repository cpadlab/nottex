import re
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


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    message: str = "auth.register_success"


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

