from typing import List
from fastapi import APIRouter, Depends, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.controllers.auth import AuthController
from app.controllers.workspace import WorkspaceController
from app.schemas.user import UserResponse
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceDeleteRequest,
    WorkspaceDeleteResponse,
    WorkspaceResponse,
    WorkspaceUpdate,
)
from app.shared.rate_limit import limit_account, limit_authenticated_request, limit_ip

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])
security = HTTPBearer(auto_error=False)


async def get_current_user_dep(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserResponse:
    token = credentials.credentials if credentials else None
    user = await AuthController.get_current_user(token)
    await limit_authenticated_request(request, user.id)
    return user


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    payload: WorkspaceCreate,
    request: Request,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    await limit_ip(request, "create_workspace", limit=20, window_seconds=3600)
    await limit_account("create_workspace", current_user.id, limit=20, window_seconds=3600)
    return await WorkspaceController.create_workspace(current_user.id, payload)


@router.get("", response_model=List[WorkspaceResponse])
async def get_workspaces(
    current_user: UserResponse = Depends(get_current_user_dep),
):
    return await WorkspaceController.get_workspaces(current_user.id)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    return await WorkspaceController.get_workspace(current_user.id, workspace_id)


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: str,
    payload: WorkspaceUpdate,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    return await WorkspaceController.update_workspace(current_user.id, workspace_id, payload)


@router.delete("/{workspace_id}", response_model=WorkspaceDeleteResponse)
async def delete_workspace(
    workspace_id: str,
    payload: WorkspaceDeleteRequest,
    current_user: UserResponse = Depends(get_current_user_dep),
):
    return await WorkspaceController.delete_workspace(current_user.id, workspace_id, payload)

