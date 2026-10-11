from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.controllers.auth import AuthController
from app.controllers.note import NoteController
from app.schemas.note import (
    NoteCreate,
    NoteDuplicateRequest,
    NoteResponse,
    NoteShareRequest,
    NoteUnshareRequest,
    NoteUpdate,
    PaginatedNotesResponse,
    WorkspaceWithNotesResponse,
)
from app.schemas.user import UserResponse
from app.shared.rate_limit import limit_account, limit_authenticated_request, limit_ip
from app.shared.broadcaster import SSELimitExceeded
from app.shared.rate_limit import client_ip

router = APIRouter(prefix="/notes", tags=["Notes"])
security = HTTPBearer(auto_error=False)


async def get_optional_user_dep(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Optional[UserResponse]:
    if not credentials:
        return None
    try:
        user = await AuthController.get_current_user(credentials.credentials)
    except Exception:
        return None
    await limit_authenticated_request(request, user.id)
    return user


async def get_required_user_dep(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserResponse:
    token = credentials.credentials if credentials else None
    user = await AuthController.get_current_user(token)
    await limit_authenticated_request(request, user.id)
    return user


async def _guard_sse_session(generator, token: Optional[str], expected_user_id: Optional[str]):
    """Revalidate authenticated SSE sessions before forwarding each frame."""
    async for frame in generator:
        if token:
            try:
                current_user = await AuthController.get_current_user(token)
            except HTTPException:
                break
            if current_user.id != expected_user_id:
                break
        yield frame


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    payload: NoteCreate,
    request: Request,
    current_user: UserResponse = Depends(get_required_user_dep),
):
    await limit_ip(request, "create_note", limit=60, window_seconds=3600)
    await limit_account("create_note", current_user.id, limit=60, window_seconds=3600)
    return await NoteController.create_note(current_user.id, payload)


@router.get("", response_model=PaginatedNotesResponse)
async def list_notes(
    workspace_id: Optional[str] = Query(None, description="Filtrar por workspace ID (o 'root' para notas sin carpeta)"),
    is_pinned: Optional[bool] = Query(None, description="Filtrar por notas fijadas"),
    is_trashed: bool = Query(False, description="True para ver la papelera"),
    tag: Optional[str] = Query(None, description="Filtrar por etiqueta específica"),
    search: Optional[str] = Query(None, description="Búsqueda por texto en título o contenido"),
    sort_by: str = Query("updated_at", description="Campo para ordenar: updated_at, created_at, title"),
    sort_order: int = Query(-1, description="-1 para descendente (recientes primero), 1 para ascendente"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: UserResponse = Depends(get_required_user_dep),
):
    return await NoteController.list_notes(
        user_id=current_user.id,
        workspace_id=workspace_id,
        is_pinned=is_pinned,
        is_trashed=is_trashed,
        tag=tag,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.get("/events/user")
async def user_events(
    request: Request,
    user: UserResponse = Depends(get_required_user_dep),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Global Server-Sent Events (SSE) endpoint to receive realtime updates across all devices
    when a note is created, trashed, restored, deleted or shared.
    """
    await limit_ip(request, "sse_connection", limit=20, window_seconds=60)
    try:
        queue = await NoteController.open_user_events(user.id)
    except SSELimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="error.sse_connection_limit",
            headers={"Retry-After": "30"},
        ) from exc
    generator = _guard_sse_session(
        NoteController.subscribe_user_events(user.id, queue), credentials.credentials, user.id
    )
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/by-workspaces", response_model=List[WorkspaceWithNotesResponse])
async def list_workspaces_with_notes(
    current_user: UserResponse = Depends(get_required_user_dep),
):
    return await NoteController.list_workspaces_with_notes(current_user.id)


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    request: Request,
    user: Optional[UserResponse] = Depends(get_optional_user_dep),
):
    await limit_ip(request, "public_note_read", limit=120, window_seconds=60)
    user_id = user.id if user else None
    return await NoteController.get_note(note_id, user_id)


@router.put("/{note_id}", response_model=NoteResponse)
@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    payload: NoteUpdate,
    current_user: UserResponse = Depends(get_required_user_dep),
):
    return await NoteController.update_note(note_id, current_user.id, payload)


@router.delete("/trash/empty")
async def empty_trash(
    current_user: UserResponse = Depends(get_required_user_dep),
):
    return await NoteController.empty_trash(current_user.id)


@router.delete("/{note_id}")
async def delete_note(
    note_id: str,
    permanent: bool = Query(False, description="Si es True elimina de base de datos; si es False mueve a papelera"),
    current_user: UserResponse = Depends(get_required_user_dep),
):
    return await NoteController.delete_note(note_id, current_user.id, permanent=permanent)


@router.post("/{note_id}/restore", response_model=NoteResponse)
async def restore_note(
    note_id: str,
    current_user: UserResponse = Depends(get_required_user_dep),
):
    return await NoteController.restore_note(note_id, current_user.id)


@router.post("/{note_id}/duplicate", response_model=NoteResponse)
async def duplicate_note(
    note_id: str,
    payload: NoteDuplicateRequest,
    request: Request,
    current_user: UserResponse = Depends(get_required_user_dep),
):
    await limit_ip(request, "create_note", limit=60, window_seconds=3600)
    await limit_account("create_note", current_user.id, limit=60, window_seconds=3600)
    return await NoteController.duplicate_note(note_id, current_user.id, payload)


@router.post("/{note_id}/share", response_model=NoteResponse)
async def share_note(
    note_id: str,
    payload: NoteShareRequest,
    request: Request,
    current_user: UserResponse = Depends(get_required_user_dep),
):
    await limit_ip(request, "note_sharing", limit=30, window_seconds=3600)
    await limit_account("note_sharing", current_user.id, limit=30, window_seconds=3600)
    return await NoteController.share_note(note_id, current_user.id, payload)


@router.post("/{note_id}/unshare", response_model=NoteResponse)
async def unshare_note(
    note_id: str,
    payload: NoteUnshareRequest,
    request: Request,
    current_user: UserResponse = Depends(get_required_user_dep),
):
    await limit_ip(request, "note_sharing", limit=30, window_seconds=3600)
    await limit_account("note_sharing", current_user.id, limit=30, window_seconds=3600)
    return await NoteController.unshare_note(note_id, current_user.id, payload)


@router.get("/{note_id}/events")
async def note_events(
    note_id: str,
    request: Request,
    user: Optional[UserResponse] = Depends(get_optional_user_dep),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Server-Sent Events (SSE) endpoint to receive realtime updates when a note is edited
    from another device or by another collaborator.
    """
    await limit_ip(request, "sse_connection", limit=20, window_seconds=60)
    user_id = user.id if user else None
    subscriber_id = user.id if user else f"ip:{client_ip(request)}"
    try:
        queue = await NoteController.open_note_events(note_id, user_id, subscriber_id)
    except SSELimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="error.sse_connection_limit",
            headers={"Retry-After": "30"},
        ) from exc

    token = credentials.credentials if credentials else None
    generator = _guard_sse_session(
        NoteController.subscribe_events(note_id, user_id, queue), token, user_id
    )
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

