from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class DeleteStrategy(str, Enum):
    CASCADE = "cascade"
    MOVE = "move"


class WorkspaceBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: Optional[str] = Field(default=None, max_length=30)
    icon: Optional[str] = Field(default=None, max_length=50)
    parent_id: Optional[str] = Field(default=None)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("error.workspace_name_empty")
        return cleaned


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    color: Optional[str] = Field(default=None, max_length=30)
    icon: Optional[str] = Field(default=None, max_length=50)
    parent_id: Optional[str] = Field(default=None)
    update_parent: bool = Field(default=False)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("error.workspace_name_empty")
            return cleaned
        return v


class WorkspaceResponse(BaseModel):
    id: str = Field(...)
    user_id: str = Field(...)
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[str] = None
    child_workspaces: List[str] = Field(default_factory=list)
    notes_count: int = Field(default=0)
    notes: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class WorkspaceDeleteRequest(BaseModel):
    strategy: DeleteStrategy = Field(default=DeleteStrategy.CASCADE)
    target_parent_id: Optional[str] = Field(default=None)


class WorkspaceDeleteResponse(BaseModel):
    message: str = "workspace.deleted_success"
    deleted_workspaces_count: int
    deleted_notes_count: int
    moved_workspaces_count: int
    moved_notes_count: int

