import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    language: str = Field(default="es", max_length=10)


class UserResponse(UserBase):
    id: str = Field(...)
    is_verified: bool = Field(default=False)
    is_totp_enabled: bool = Field(default=False)
    last_login: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(...)
    updated_at: datetime = Field(...)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower() if isinstance(v, str) else v

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def normalize_names(cls, v: str) -> str:
        return v.strip().lower() if isinstance(v, str) else v

    @field_validator("language", mode="before")
    @classmethod
    def normalize_language(cls, v: str) -> str:
        if isinstance(v, str):
            lang = v.strip().lower()
            return "en" if lang.startswith("en") else "es"
        return "es"


class UpdateProfileRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def normalize_names(cls, v: str) -> str:
        return v.strip().lower() if isinstance(v, str) else v


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)
    totp_code: Optional[str] = Field(default=None)

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


class ChangeEmailRequest(BaseModel):
    new_email: EmailStr
    password: str = Field(min_length=1)
    totp_code: Optional[str] = Field(default=None)

    @field_validator("new_email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower() if isinstance(v, str) else v


class ChangeLanguageRequest(BaseModel):
    language: str = Field(min_length=2, max_length=10)

    @field_validator("language", mode="before")
    @classmethod
    def normalize_language(cls, v: str) -> str:
        if isinstance(v, str):
            lang = v.strip().lower()
            return "en" if lang.startswith("en") else "es"
        return "es"


class UserActionResponse(BaseModel):
    message: str
    user: Optional[UserResponse] = None


class RequestDeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1)
    totp_code: Optional[str] = Field(default=None)


class ConfirmDeleteAccountRequest(BaseModel):
    token: str = Field(min_length=1)



