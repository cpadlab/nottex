from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
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

router = APIRouter(prefix="/notes", tags=["Notes"])
security = HTTPBearer(auto_error=False)


async def get_optional_user_dep(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Optional[UserResponse]:
    if not credentials:
        return None
    try:
        return await AuthController.get_current_user(credentials.credentials)
    except Exception:
        return None


async def get_required_user_dep(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserResponse:
    token = credentials.credentials if credentials else None
    return await AuthController.get_current_user(token)


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    payload: NoteCreate,
    current_user: UserResponse = Depends(get_required_user_dep),
):
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
    token: Optional[str] = Query(None, description="Access token via query param for EventSource support"),
    user: Optional[UserResponse] = Depends(get_optional_user_dep),
):
    """
    Global Server-Sent Events (SSE) endpoint to receive realtime updates across all devices
    when a note is created, trashed, restored, deleted or shared.
    """
    user_id = user.id if user else None
    if not user_id and token:
        try:
            usr = await AuthController.get_current_user(token)
            user_id = usr.id
        except Exception:
            pass

    if not user_id:
        return StreamingResponse(iter([]), media_type="text/event-stream")

    generator = NoteController.subscribe_user_events(user_id)
    return StreamingResponse(generator, media_type="text/event-stream")


@router.get("/by-workspaces", response_model=List[WorkspaceWithNotesResponse])
async def list_workspaces_with_notes(
    current_user: UserResponse = Depends(get_required_user_dep),
):
    return await NoteController.list_workspaces_with_notes(current_user.id)


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    user: Optional[UserResponse] = Depends(get_optional_user_dep),
):
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
    current_user: UserResponse = Depends(get_required_user_dep),
):
    return await NoteController.duplicate_note(note_id, current_user.id, payload)


@router.post("/{note_id}/share", response_model=NoteResponse)
async def share_note(
    note_id: str,
    payload: NoteShareRequest,
    current_user: UserResponse = Depends(get_required_user_dep),
):
    return await NoteController.share_note(note_id, current_user.id, payload)


@router.post("/{note_id}/unshare", response_model=NoteResponse)
async def unshare_note(
    note_id: str,
    payload: NoteUnshareRequest,
    current_user: UserResponse = Depends(get_required_user_dep),
):
    return await NoteController.unshare_note(note_id, current_user.id, payload)


@router.get("/{note_id}/events")
async def note_events(
    note_id: str,
    token: Optional[str] = Query(None, description="Access token via query param for EventSource support"),
    user: Optional[UserResponse] = Depends(get_optional_user_dep),
):
    """
    Server-Sent Events (SSE) endpoint to receive realtime updates when a note is edited
    from another device or by another collaborator.
    """
    user_id = user.id if user else None
    if not user_id and token:
        try:
            usr = await AuthController.get_current_user(token)
            user_id = usr.id
        except Exception:
            pass

    generator = NoteController.subscribe_events(note_id, user_id)
    return StreamingResponse(generator, media_type="text/event-stream")

