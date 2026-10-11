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

