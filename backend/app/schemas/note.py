from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.core.config import settings


def normalize_tags(value: Optional[List[str]]) -> Optional[List[str]]:
    if value is None:
        return None
    if len(value) > settings.MAX_TAGS_PER_NOTE:
        raise ValueError(f"A note can have at most {settings.MAX_TAGS_PER_NOTE} tags")
    cleaned = []
    for tag in value:
        t = tag.strip().lower()
        if len(t) > settings.MAX_TAG_LENGTH:
            raise ValueError(f"Tags can contain at most {settings.MAX_TAG_LENGTH} characters")
        if t and t not in cleaned:
            cleaned.append(t)
    return cleaned


def validate_note_content_size(value: Optional[str]) -> Optional[str]:
    if value is not None and len(value.encode("utf-8")) > settings.MAX_NOTE_CONTENT_BYTES:
        raise ValueError(f"Note content exceeds the {settings.MAX_NOTE_CONTENT_BYTES}-byte limit")
    return value


class NotePermission(str, Enum):
    READ = "read"
    WRITE = "write"


class NoteCollaborator(BaseModel):
    user_id: str
    email: str
    permission: NotePermission = NotePermission.READ
    added_at: datetime


class NoteBase(BaseModel):
    title: Optional[str] = Field(default="", max_length=255)
    content: Optional[str] = Field(
        default="",
        max_length=settings.MAX_NOTE_CONTENT_BYTES,
        description="UTF-8 note content limit is configured by MAX_NOTE_CONTENT_BYTES.",
    )
    color: Optional[str] = Field(default=None, max_length=30)
    is_pinned: bool = Field(default=False)
    workspace_id: Optional[str] = Field(default=None)
    tags: List[str] = Field(
        default_factory=list,
        max_length=settings.MAX_TAGS_PER_NOTE,
        description="At most MAX_TAGS_PER_NOTE tags, each at most MAX_TAG_LENGTH characters.",
    )
    is_public: bool = Field(default=False)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, v: List[str]) -> List[str]:
        return normalize_tags(v) or []

    @field_validator("content")
    @classmethod
    def validate_content_size(cls, v: Optional[str]) -> Optional[str]:
        return validate_note_content_size(v)


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    content: Optional[str] = Field(
        default=None,
        max_length=settings.MAX_NOTE_CONTENT_BYTES,
        description="UTF-8 note content limit is configured by MAX_NOTE_CONTENT_BYTES.",
    )
    color: Optional[str] = Field(default=None, max_length=30)
    is_pinned: Optional[bool] = Field(default=None)
    workspace_id: Optional[str] = Field(default=None)
    update_workspace: bool = Field(default=False)
    tags: Optional[List[str]] = Field(
        default=None,
        max_length=settings.MAX_TAGS_PER_NOTE,
        description="At most MAX_TAGS_PER_NOTE tags, each at most MAX_TAG_LENGTH characters.",
    )
    is_public: Optional[bool] = Field(default=None)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        return normalize_tags(v)

    @field_validator("content")
    @classmethod
    def validate_content_size(cls, v: Optional[str]) -> Optional[str]:
        return validate_note_content_size(v)


class NoteShareRequest(BaseModel):
    email: EmailStr
    permission: NotePermission = NotePermission.READ

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class NoteUnshareRequest(BaseModel):
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class NoteResponse(BaseModel):
    id: str
    user_id: str
    title: str = ""
    content: str = ""
    color: Optional[str] = None
    is_pinned: bool = False
    is_trashed: bool = False
    trashed_at: Optional[datetime] = None
    workspace_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    is_public: bool = False
    is_shared: bool = False
    collaborators: List[NoteCollaborator] = Field(default_factory=list)
    my_permission: str = "owner"
    version: int = 1
    created_at: datetime
    updated_at: datetime


class NoteDuplicateRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    workspace_id: Optional[str] = None


class PaginatedNotesResponse(BaseModel):
    items: List[NoteResponse]
    total: int
    page: int
    page_size: int
    pages: int


class WorkspaceWithNotesResponse(BaseModel):
    id: str
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[str] = None
    notes: List[NoteResponse]
    child_workspaces: List[str]
    created_at: datetime
    updated_at: datetime
