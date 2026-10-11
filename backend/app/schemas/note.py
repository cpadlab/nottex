from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


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
    content: Optional[str] = Field(default="")
    color: Optional[str] = Field(default=None, max_length=30)
    is_pinned: bool = Field(default=False)
    workspace_id: Optional[str] = Field(default=None)
    tags: List[str] = Field(default_factory=list)
    is_public: bool = Field(default=False)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, v: List[str]) -> List[str]:
        cleaned = []
        for tag in v:
            t = tag.strip().lower()
            if t and t not in cleaned:
                cleaned.append(t)
        return cleaned


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    content: Optional[str] = Field(default=None)
    color: Optional[str] = Field(default=None, max_length=30)
    is_pinned: Optional[bool] = Field(default=None)
    workspace_id: Optional[str] = Field(default=None)
    update_workspace: bool = Field(default=False)
    tags: Optional[List[str]] = Field(default=None)
    is_public: Optional[bool] = Field(default=None)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        cleaned = []
        for tag in v:
            t = tag.strip().lower()
            if t and t not in cleaned:
                cleaned.append(t)
        return cleaned


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
    title: Optional[str] = None
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
