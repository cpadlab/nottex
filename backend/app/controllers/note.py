import asyncio
from datetime import datetime, timezone
import json
from typing import AsyncGenerator, List, Optional
import uuid

from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.note import (
    NoteCreate,
    NoteDuplicateRequest,
    NotePermission,
    NoteResponse,
    NoteShareRequest,
    NoteUnshareRequest,
    NoteUpdate,
    PaginatedNotesResponse,
    WorkspaceWithNotesResponse,
)
from app.shared.broadcaster import note_broadcaster, user_broadcaster
from app.shared.database import db
from app.shared.emailer import emailer
from app.shared.logger import get_logger
from app.shared.security import decrypt_note_document, decrypt_note_field, encrypt_note_field

logger = get_logger(__name__)


async def send_note_shared_email_task(
    recipient_email: str,
    recipient_name: str,
    shared_by_name: str,
    note_id: str,
    note_title: str,
    permission: str,
    language: str = "es",
) -> None:
    """
    Background worker task to dispatch notification email when a note is shared.
    """
    note_url = f"{settings.FRONTEND_URL}/notes/{note_id}"
    is_en = language.lower().startswith("en")
    template_name = "en/note_shared.html" if is_en else "es/note_shared.html"
    permission_label = "read-only" if (permission == "read" and is_en) else (
        "edit" if (permission == "write" and is_en) else (
            "solo lectura" if permission == "read" else "edición"
        )
    )
    subject = (
        f"{shared_by_name} shared a note with you on {settings.APP_NAME}"
        if is_en
        else f"{shared_by_name} ha compartido una nota contigo en {settings.APP_NAME}"
    )

    try:
        await emailer.send_email(
            to=recipient_email,
            subject=subject,
            template_name=template_name,
            context={
                "app_name": settings.APP_NAME,
                "recipient_name": recipient_name.capitalize(),
                "shared_by_name": shared_by_name.capitalize(),
                "note_title": note_title or ("Sin título" if not is_en else "Untitled"),
                "permission_label": permission_label,
                "note_url": note_url,
            },
        )
    except Exception as e:
        logger.error(f"Error sending note shared email to {recipient_email}: {e}")


class NoteController:
    """
    Business logic for notes:
    - Creation, editing, deletion
    - Private ownership, sharing with registered users (read/write), public read access
    - Robust search (regex/text), tags filter, pinned filter, pagination, sorting
    - Real-time multidisplay SSE broadcast on updates
    """

    @staticmethod
    def _get_notes_col():
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )
        return db.notes["notes"]

    @staticmethod
    def _get_workspaces_col():
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )
        return db.notes["workspaces"]

    @staticmethod
    def _get_users_col():
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )
        return db.users["users"]

    @staticmethod
    def _can_read(note_doc: dict, user_id: Optional[str]) -> bool:
        """
        Determines whether the user can read the note:
        - True if user is the owner
        - Notes in trash are private to their owner
        - True if note is public (when not trashed)
        - True if user is in collaborators list
        """
        if note_doc.get("is_trashed") is True:
            return bool(user_id) and note_doc.get("user_id") == user_id
        if note_doc.get("is_public") is True:
            return True
        if not user_id:
            return False
        if note_doc.get("user_id") == user_id:
            return True
        for c in note_doc.get("collaborators", []):
            if c.get("user_id") == user_id:
                return True
        return False

    @staticmethod
    def _can_write(note_doc: dict, user_id: str) -> bool:
        """
        Determines whether the user can edit the note:
        - True if user is the owner
        - True if user is in collaborators list with WRITE permission
        """
        if note_doc.get("user_id") == user_id:
            return True
        for c in note_doc.get("collaborators", []):
            if c.get("user_id") == user_id and c.get("permission") == NotePermission.WRITE.value:
                return True
        return False

    @staticmethod
    def _doc_to_response(doc: dict, current_user_id: Optional[str] = None) -> NoteResponse:
        doc = decrypt_note_document(doc)
        is_owner = doc["user_id"] == current_user_id if current_user_id else False
        my_perm = "owner" if is_owner else "viewer"
        if not is_owner and current_user_id:
            for c in doc.get("collaborators", []):
                if c.get("user_id") == current_user_id:
                    my_perm = c.get("permission", "read")
                    break

        return NoteResponse(
            id=doc["id"],
            user_id=doc["user_id"],
            title=doc.get("title", ""),
            content=doc.get("content", ""),
            color=doc.get("color"),
            is_pinned=doc.get("is_pinned", False),
            is_trashed=doc.get("is_trashed", False),
            trashed_at=doc.get("trashed_at"),
            workspace_id=doc.get("workspace_id"),
            tags=doc.get("tags", []),
            is_public=doc.get("is_public", False),
            is_shared=not is_owner if current_user_id else bool(doc.get("collaborators")),
            collaborators=doc.get("collaborators", []),
            my_permission=my_perm,
            version=doc.get("version", 1),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        )

    @staticmethod
    async def create_note(user_id: str, payload: NoteCreate) -> NoteResponse:
        notes_col = NoteController._get_notes_col()
        workspaces_col = NoteController._get_workspaces_col()

        if payload.workspace_id:
            ws = await workspaces_col.find_one({"user_id": user_id, "id": payload.workspace_id})
            if not ws:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="error.workspace_not_found",
                )

        now = datetime.now(timezone.utc)
        note_id = str(uuid.uuid4())

        doc = {
            "_id": note_id,
            "id": note_id,
            "user_id": user_id,
            "title": payload.title or "",
            "content": payload.content or "",
            "color": payload.color,
            "is_pinned": payload.is_pinned,
            "workspace_id": payload.workspace_id,
            "tags": payload.tags,
            "is_public": payload.is_public,
            "collaborators": [],
            "version": 1,
            "created_at": now,
            "updated_at": now,
        }

        stored_doc = {
            **doc,
            "title": encrypt_note_field(doc["title"]),
            "content": encrypt_note_field(doc["content"]),
            "encryption_version": 1,
        }
        await notes_col.insert_one(stored_doc)
        logger.info(f"Note {note_id} created by user {user_id}")
        resp = NoteController._doc_to_response(doc, user_id)

        await user_broadcaster.publish(user_id, {
            "type": "note_created",
            "note_id": note_id,
            "data": resp.model_dump(mode="json"),
        })

        return resp

    @staticmethod
    async def get_note(note_id: str, user_id: Optional[str]) -> NoteResponse:
        notes_col = NoteController._get_notes_col()
        doc = await notes_col.find_one({"id": note_id})
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.note_not_found",
            )

        if not NoteController._can_read(doc, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="error.note_access_denied",
            )

        return NoteController._doc_to_response(doc)

    @staticmethod
    async def update_note(note_id: str, user_id: str, payload: NoteUpdate) -> NoteResponse:
        notes_col = NoteController._get_notes_col()
        workspaces_col = NoteController._get_workspaces_col()

        doc = await notes_col.find_one({"id": note_id})
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.note_not_found",
            )

        if not NoteController._can_write(doc, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="error.note_write_access_denied",
            )

        update_fields = {}

        if payload.title is not None:
            update_fields["title"] = encrypt_note_field(payload.title)
        if payload.content is not None:
            update_fields["content"] = encrypt_note_field(payload.content)
        if "title" in update_fields or "content" in update_fields:
            update_fields["encryption_version"] = 1
        if payload.color is not None:
            update_fields["color"] = payload.color
        if payload.is_pinned is not None:
            update_fields["is_pinned"] = payload.is_pinned
        if payload.tags is not None:
            update_fields["tags"] = payload.tags

        if payload.is_public is not None and doc["user_id"] == user_id:
            update_fields["is_public"] = payload.is_public

        if payload.update_workspace and doc["user_id"] == user_id:
            if payload.workspace_id:
                ws = await workspaces_col.find_one({"user_id": user_id, "id": payload.workspace_id})
                if not ws:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="error.workspace_not_found",
                    )
            update_fields["workspace_id"] = payload.workspace_id

        now = datetime.now(timezone.utc)
        update_fields["updated_at"] = now
        new_version = doc.get("version", 1) + 1
        update_fields["version"] = new_version

        await notes_col.update_one({"id": note_id}, {"$set": update_fields})
        updated_doc = await notes_col.find_one({"id": note_id})

        resp = NoteController._doc_to_response(updated_doc)
        event_payload = {
            "type": "note_updated",
            "note_id": note_id,
            "version": new_version,
            "updated_by": user_id,
            "updated_at": now.isoformat(),
            "data": resp.model_dump(mode="json"),
        }
        await note_broadcaster.publish(note_id, event_payload)

        return resp

    @staticmethod
    async def delete_note(note_id: str, user_id: str, permanent: bool = False) -> dict:
        """
        Deletes or leaves a note:
        - If the user is a collaborator (not owner): removes the user from collaborators list
          (leaving the note so it disappears from their view).
        - If the user is the owner:
          - If permanent=False: moves the note to trash (soft-delete).
          - If permanent=True (or note is already in trash): permanently deletes from database.
        """
        notes_col = NoteController._get_notes_col()
        doc = await notes_col.find_one({"id": note_id})
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.note_not_found",
            )

        now = datetime.now(timezone.utc)

        if doc["user_id"] != user_id:
            collaborators = doc.get("collaborators", [])
            is_collab = any(c.get("user_id") == user_id for c in collaborators)
            if not is_collab:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="error.note_access_denied",
                )

            new_collabs = [c for c in collaborators if c.get("user_id") != user_id]
            await notes_col.update_one(
                {"id": note_id},
                {"$set": {"collaborators": new_collabs, "updated_at": now}},
            )
            await note_broadcaster.publish(note_id, {
                "type": "access_changed",
                "note_id": note_id,
            })

            await user_broadcaster.publish(user_id, {
                "type": "note_left",
                "note_id": note_id,
            })
            return {"message": "note.left_success"}

        if permanent or doc.get("is_trashed") is True:
            await notes_col.delete_one({"id": note_id})

            await note_broadcaster.publish(note_id, {
                "type": "note_deleted",
                "note_id": note_id,
                "deleted_by": user_id,
            })
            await user_broadcaster.publish(user_id, {
                "type": "note_permanently_deleted",
                "note_id": note_id,
            })
            for c in doc.get("collaborators", []):
                await user_broadcaster.publish(c["user_id"], {
                    "type": "note_permanently_deleted",
                    "note_id": note_id,
                })

            return {"message": "note.permanently_deleted_success"}

        await notes_col.update_one(
            {"id": note_id},
            {"$set": {"is_trashed": True, "trashed_at": now, "updated_at": now}},
        )
        await note_broadcaster.publish(note_id, {
            "type": "access_changed",
            "note_id": note_id,
        })
        await user_broadcaster.publish(user_id, {
            "type": "note_trashed",
            "note_id": note_id,
        })
        return {"message": "note.trashed_success"}

    @staticmethod
    async def restore_note(note_id: str, user_id: str) -> NoteResponse:
        """
        Restores a note from trash back to active notes.
        """
        notes_col = NoteController._get_notes_col()
        doc = await notes_col.find_one({"id": note_id, "user_id": user_id})
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.note_not_found",
            )

        now = datetime.now(timezone.utc)
        await notes_col.update_one(
            {"id": note_id},
            {"$set": {"is_trashed": False, "trashed_at": None, "updated_at": now}},
        )
        updated_doc = await notes_col.find_one({"id": note_id})
        resp = NoteController._doc_to_response(updated_doc, user_id)

        await user_broadcaster.publish(user_id, {
            "type": "note_restored",
            "note_id": note_id,
            "data": resp.model_dump(mode="json"),
        })
        return resp

    @staticmethod
    async def empty_trash(user_id: str) -> dict:
        """
        Permanently purges all notes in trash belonging to the user.
        """
        notes_col = NoteController._get_notes_col()
        res = await notes_col.delete_many({"user_id": user_id, "is_trashed": True})

        await user_broadcaster.publish(user_id, {
            "type": "trash_emptied",
            "count": res.deleted_count,
        })

        return {
            "message": "note_messages.trash_emptied_success",
            "count": res.deleted_count,
        }

    @staticmethod
    async def duplicate_note(note_id: str, user_id: str, payload: NoteDuplicateRequest) -> NoteResponse:

        """
        Creates an independent copy of an existing note (even if shared) in the user's workspace.
        """
        notes_col = NoteController._get_notes_col()
        workspaces_col = NoteController._get_workspaces_col()

        doc = await notes_col.find_one({"id": note_id})
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.note_not_found",
            )

        if not NoteController._can_read(doc, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="error.note_access_denied",
            )

        doc = decrypt_note_document(doc)

        dest_ws = payload.workspace_id if payload.workspace_id is not None else doc.get("workspace_id")
        if dest_ws:
            ws = await workspaces_col.find_one({"user_id": user_id, "id": dest_ws})
            if not ws:
                dest_ws = None

        now = datetime.now(timezone.utc)
        new_note_id = str(uuid.uuid4())
        new_title = payload.title if payload.title is not None else (
            f"{doc.get('title', '')} (Copia)" if doc.get("title") else "Copia"
        )

        new_doc = {
            "_id": new_note_id,
            "id": new_note_id,
            "user_id": user_id,
            "title": encrypt_note_field(new_title),
            "content": encrypt_note_field(doc.get("content", "")),
            "encryption_version": 1,
            "color": doc.get("color"),
            "is_pinned": False,
            "is_trashed": False,
            "trashed_at": None,
            "workspace_id": dest_ws,
            "tags": list(doc.get("tags", [])),
            "is_public": False,
            "collaborators": [],
            "version": 1,
            "created_at": now,
            "updated_at": now,
        }

        await notes_col.insert_one(new_doc)
        resp = NoteController._doc_to_response(new_doc, user_id)

        await user_broadcaster.publish(user_id, {
            "type": "note_created",
            "note_id": new_note_id,
            "data": resp.model_dump(mode="json"),
        })

        return resp

    @staticmethod
    async def share_note(
        note_id: str,
        owner_id: str,
        payload: NoteShareRequest,
    ) -> NoteResponse:
        """
        Shares a note with a registered user by email and dispatches an invitation email.
        """
        notes_col = NoteController._get_notes_col()
        users_col = NoteController._get_users_col()

        note = await notes_col.find_one({"id": note_id})
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.note_not_found",
            )

        if note["user_id"] != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="error.only_owner_can_share_note",
            )

        note = decrypt_note_document(note)

        recipient = await users_col.find_one({"email": payload.email})
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.collaborator_user_not_found",
            )

        if recipient["id"] == owner_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="error.cannot_share_with_yourself",
            )

        owner = await users_col.find_one({"id": owner_id})
        owner_name = f"{owner.get('first_name', '')} {owner.get('last_name', '')}".strip() if owner else "Un usuario"

        now = datetime.now(timezone.utc)
        collaborators = note.get("collaborators", [])

        updated = False
        for c in collaborators:
            if c.get("user_id") == recipient["id"]:
                c["permission"] = payload.permission.value
                c["added_at"] = now
                updated = True
                break

        if not updated:
            if len(collaborators) >= settings.MAX_COLLABORATORS_PER_NOTE:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="error.collaborator_limit_reached",
                )
            collaborators.append({
                "user_id": recipient["id"],
                "email": payload.email,
                "permission": payload.permission.value,
                "added_at": now,
            })

        await notes_col.update_one(
            {"id": note_id},
            {"$set": {"collaborators": collaborators, "updated_at": now}},
        )

        recipient_lang = recipient.get("language", "es")
        asyncio.create_task(
            send_note_shared_email_task(
                recipient_email=payload.email,
                recipient_name=recipient.get("first_name", ""),
                shared_by_name=owner_name,
                note_id=note_id,
                note_title=note.get("title", ""),
                permission=payload.permission.value,
                language=recipient_lang,
            )
        )

        updated_doc = await notes_col.find_one({"id": note_id})
        return NoteController._doc_to_response(updated_doc)

    @staticmethod
    async def unshare_note(
        note_id: str,
        owner_id: str,
        payload: NoteUnshareRequest,
    ) -> NoteResponse:
        notes_col = NoteController._get_notes_col()
        note = await notes_col.find_one({"id": note_id})
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.note_not_found",
            )

        if note["user_id"] != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="error.only_owner_can_share_note",
            )

        now = datetime.now(timezone.utc)
        existing_collaborators = note.get("collaborators", [])
        collaborators = [c for c in existing_collaborators if c.get("email") != payload.email]

        await notes_col.update_one(
            {"id": note_id},
            {"$set": {"collaborators": collaborators, "updated_at": now}},
        )
        if len(collaborators) != len(existing_collaborators):
            await note_broadcaster.publish(note_id, {
                "type": "access_changed",
                "note_id": note_id,
            })

        updated_doc = await notes_col.find_one({"id": note_id})
        return NoteController._doc_to_response(updated_doc)

    @staticmethod
    async def list_notes(
        user_id: str,
        workspace_id: Optional[str] = None,
        is_pinned: Optional[bool] = None,
        is_trashed: bool = False,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "updated_at",
        sort_order: int = -1,
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedNotesResponse:
        notes_col = NoteController._get_notes_col()

        base_query = {
            "$or": [
                {"user_id": user_id},
                {"collaborators.user_id": user_id},
            ]
        }

        query_filters = [base_query]

        query_filters.append({"is_trashed": is_trashed})

        if workspace_id is not None:
            query_filters.append({"workspace_id": workspace_id if workspace_id != "root" else None})

        if is_pinned is not None:
            query_filters.append({"is_pinned": is_pinned})

        if tag:
            query_filters.append({"tags": tag.strip().lower()})

        normalized_search = search.strip() if search else ""
        if len(normalized_search) > settings.MAX_NOTE_SEARCH_LENGTH:
            raise HTTPException(status_code=422, detail="error.search_query_too_long")

        final_query = {"$and": query_filters}

        valid_sort_fields = ["updated_at", "created_at", "title"]
        sort_field = sort_by if sort_by in valid_sort_fields else "updated_at"
        order = -1 if sort_order == -1 else 1

        skip = max(0, (page - 1) * page_size)
        if normalized_search or sort_field == "title":
            matches = []
            scanned_bytes = 0
            scanned_records = 0
            needle = normalized_search.casefold()
            cursor = notes_col.find(final_query).limit(settings.MAX_NOTE_SEARCH_SCAN + 1).max_time_ms(3000)
            async for raw_doc in cursor:
                scanned_records += 1
                if scanned_records > settings.MAX_NOTE_SEARCH_SCAN:
                    raise HTTPException(status_code=422, detail="error.note_list_scope_too_large")
                if normalized_search:
                    plain_doc = decrypt_note_document(raw_doc)
                    title = plain_doc.get("title") or ""
                    content = plain_doc.get("content") or ""
                    scanned_bytes += len(title.encode("utf-8")) + len(content.encode("utf-8"))
                    if scanned_bytes > settings.MAX_NOTE_SEARCH_BYTES:
                        raise HTTPException(status_code=422, detail="error.note_list_scope_too_large")
                    if needle not in title.casefold() and needle not in content.casefold():
                        continue
                    sort_value = plain_doc.get(sort_field) if sort_field != "title" else title.casefold()
                else:
                    sort_value = decrypt_note_field(raw_doc.get("title", "")).casefold()
                matches.append((sort_value or "", raw_doc["id"]))
            matches.sort(key=lambda item: item[0], reverse=order < 0)
            total = len(matches)
            selected_ids = [note_id for _, note_id in matches[skip:skip + page_size]]
            if selected_ids:
                page_docs = await notes_col.find(
                    {"$and": [final_query, {"id": {"$in": selected_ids}}]}
                ).to_list(length=len(selected_ids))
                docs_by_id = {doc["id"]: decrypt_note_document(doc) for doc in page_docs}
                docs = [docs_by_id[note_id] for note_id in selected_ids if note_id in docs_by_id]
            else:
                docs = []
        else:
            total = await notes_col.count_documents(final_query, maxTimeMS=3000)
            cursor = notes_col.find(final_query).sort(sort_field, order).skip(skip).limit(page_size).max_time_ms(3000)
            docs = [decrypt_note_document(doc) async for doc in cursor]

        items = [NoteController._doc_to_response(d, user_id) for d in docs]
        pages = max(1, (total + page_size - 1) // page_size)

        return PaginatedNotesResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
        )

    @staticmethod
    async def list_workspaces_with_notes(user_id: str) -> List[WorkspaceWithNotesResponse]:
        """
        Lists all workspaces for user with their direct notes included.
        """
        workspaces_col = NoteController._get_workspaces_col()
        notes_col = NoteController._get_notes_col()

        ws_docs = await workspaces_col.find({"user_id": user_id}).sort("created_at", 1).to_list(length=None)
        workspace_ids = [ws["id"] for ws in ws_docs]
        children: dict[str, list[str]] = {}
        grouped_notes: dict[str, list[dict]] = {}
        async for child in workspaces_col.find(
            {"user_id": user_id, "parent_id": {"$in": workspace_ids}}, {"id": 1, "parent_id": 1}
        ):
            children.setdefault(child["parent_id"], []).append(child["id"])
        async for note in notes_col.find(
            {"user_id": user_id, "workspace_id": {"$in": workspace_ids}}
        ).sort("updated_at", -1):
            grouped_notes.setdefault(note["workspace_id"], []).append(note)

        return [WorkspaceWithNotesResponse(
            id=ws["id"], name=ws["name"], color=ws.get("color"), icon=ws.get("icon"),
            parent_id=ws.get("parent_id"),
            notes=[NoteController._doc_to_response(n) for n in grouped_notes.get(ws["id"], [])],
            child_workspaces=children.get(ws["id"], []), created_at=ws["created_at"], updated_at=ws["updated_at"],
        ) for ws in ws_docs]

    @staticmethod
    async def open_note_events(note_id: str, user_id: Optional[str], subscriber_id: str) -> asyncio.Queue:
        """
        Validate permissions and reserve bounded SSE resources before HTTP streaming starts.
        """
        notes_col = NoteController._get_notes_col()
        doc = await notes_col.find_one({"id": note_id})
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.note_not_found",
            )

        if not NoteController._can_read(doc, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="error.note_access_denied",
            )

        return await note_broadcaster.subscribe(note_id, subscriber_id)

    @staticmethod
    async def subscribe_events(
        note_id: str, user_id: Optional[str], queue: asyncio.Queue
    ) -> AsyncGenerator[str, None]:
        """SSE generator for a previously authorized and reserved note stream."""
        notes_col = NoteController._get_notes_col()

        try:
            yield f"data: {json.dumps({'type': 'connected', 'note_id': note_id})}\n\n"

            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=25.0)
                except asyncio.TimeoutError:
                    current_doc = await notes_col.find_one({"id": note_id})
                    if not current_doc or not NoteController._can_read(current_doc, user_id):
                        break
                    yield ": keep-alive\n\n"
                    continue

                current_doc = await notes_col.find_one({"id": note_id})
                if not current_doc or not NoteController._can_read(current_doc, user_id):
                    break
                if event.get("type") == "resync_required":
                    yield f"data: {json.dumps(event)}\n\n"
                    break
                if event.get("type") == "access_changed":
                    continue
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            await note_broadcaster.unsubscribe(note_id, queue)

    @staticmethod
    async def open_user_events(user_id: str) -> asyncio.Queue:
        """Reserve bounded resources before starting the SSE response."""
        return await user_broadcaster.subscribe(user_id)

    @staticmethod
    async def subscribe_user_events(user_id: str, queue: asyncio.Queue) -> AsyncGenerator[str, None]:
        """
        Global Server-Sent Events (SSE) generator for user-level updates:
        - Detects when notes are created, trashed, restored, permanently deleted, or shared from another device.
        """
        try:
            yield f"data: {json.dumps({'type': 'connected', 'user_id': user_id})}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {json.dumps(event)}\n\n"
                    if event.get("type") == "resync_required":
                        break
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            await user_broadcaster.unsubscribe(user_id, queue)


