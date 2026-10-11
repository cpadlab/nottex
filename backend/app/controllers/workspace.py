from datetime import datetime, timezone
from typing import List, Optional, Set
import uuid

from fastapi import HTTPException, status

from app.schemas.workspace import (
    DeleteStrategy,
    WorkspaceCreate,
    WorkspaceDeleteRequest,
    WorkspaceDeleteResponse,
    WorkspaceResponse,
    WorkspaceUpdate,
)
from app.shared.database import db
from app.shared.logger import get_logger

logger = get_logger(__name__)


class WorkspaceController:
    """
    Controller handling business logic for workspaces:
    - Stored in the notes database (`db.notes["workspaces"]`)
    - Private and isolated per user (`user_id`)
    - Supports nested hierarchies, creation, editing, moving, and robust deletion
    """

    @staticmethod
    def _get_workspaces_collection():
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )
        return db.notes["workspaces"]

    @staticmethod
    def _get_notes_collection():
        if not db.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="error.database_unavailable",
            )
        return db.notes["notes"]

    @staticmethod
    async def _populate_workspace_response(
        ws_doc: dict,
        workspaces_col,
        notes_col,
    ) -> WorkspaceResponse:
        """
        Calculates direct child workspaces and notes for a given workspace document.
        """
        ws_id = ws_doc["id"]
        user_id = ws_doc["user_id"]

        child_cursor = workspaces_col.find(
            {"user_id": user_id, "parent_id": ws_id},
            {"id": 1},
        )
        child_docs = await child_cursor.to_list(length=None)
        child_ids = [c["id"] for c in child_docs]

        notes_cursor = notes_col.find(
            {"user_id": user_id, "workspace_id": ws_id},
            {"id": 1},
        )
        note_docs = await notes_cursor.to_list(length=None)
        note_ids = [n["id"] for n in note_docs]

        return WorkspaceResponse(
            id=ws_doc["id"],
            user_id=ws_doc["user_id"],
            name=ws_doc["name"],
            color=ws_doc.get("color"),
            icon=ws_doc.get("icon"),
            parent_id=ws_doc.get("parent_id"),
            child_workspaces=child_ids,
            notes_count=len(note_ids),
            notes=note_ids,
            created_at=ws_doc["created_at"],
            updated_at=ws_doc["updated_at"],
        )

    @staticmethod
    async def _check_cycle(
        workspaces_col,
        user_id: str,
        workspace_id: str,
        new_parent_id: str,
    ) -> bool:
        """
        Traverses upward from new_parent_id to verify that workspace_id
        is not an ancestor of new_parent_id (which would create a cycle).
        Returns True if a cycle is detected.
        """
        if workspace_id == new_parent_id:
            return True

        curr_id = new_parent_id
        visited: Set[str] = set()

        while curr_id:
            if curr_id in visited:
                return True
            visited.add(curr_id)

            if curr_id == workspace_id:
                return True

            parent_doc = await workspaces_col.find_one(
                {"user_id": user_id, "id": curr_id},
                {"parent_id": 1},
            )
            if not parent_doc:
                break
            curr_id = parent_doc.get("parent_id")

        return False

    @staticmethod
    async def create_workspace(user_id: str, payload: WorkspaceCreate) -> WorkspaceResponse:
        """
        Creates a new private workspace for the user.
        Validates parent workspace existence and ownership if parent_id is specified.
        """
        workspaces_col = WorkspaceController._get_workspaces_collection()
        notes_col = WorkspaceController._get_notes_collection()

        if payload.parent_id:
            parent = await workspaces_col.find_one({"user_id": user_id, "id": payload.parent_id})
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="error.parent_workspace_not_found",
                )

        now = datetime.now(timezone.utc)
        ws_id = str(uuid.uuid4())

        doc = {
            "_id": ws_id,
            "id": ws_id,
            "user_id": user_id,
            "name": payload.name,
            "color": payload.color,
            "icon": payload.icon,
            "parent_id": payload.parent_id,
            "created_at": now,
            "updated_at": now,
        }

        await workspaces_col.insert_one(doc)
        logger.info("Workspace created")

        return await WorkspaceController._populate_workspace_response(doc, workspaces_col, notes_col)

    @staticmethod
    async def get_workspaces(user_id: str) -> List[WorkspaceResponse]:
        """
        Returns all workspaces belonging to the authenticated user.
        """
        workspaces_col = WorkspaceController._get_workspaces_collection()
        notes_col = WorkspaceController._get_notes_collection()

        docs = await workspaces_col.find({"user_id": user_id}).sort("created_at", 1).to_list(length=None)
        children: dict[str, list[str]] = {}
        notes: dict[str, list[str]] = {}
        async for child in workspaces_col.find(
            {"user_id": user_id, "parent_id": {"$in": [doc["id"] for doc in docs]}}, {"id": 1, "parent_id": 1}
        ):
            children.setdefault(child["parent_id"], []).append(child["id"])
        async for note in notes_col.find(
            {"user_id": user_id, "workspace_id": {"$in": [doc["id"] for doc in docs]}}, {"id": 1, "workspace_id": 1}
        ):
            notes.setdefault(note["workspace_id"], []).append(note["id"])

        return [
            WorkspaceResponse(
                id=doc["id"], user_id=user_id, name=doc["name"], color=doc.get("color"), icon=doc.get("icon"),
                parent_id=doc.get("parent_id"), child_workspaces=children.get(doc["id"], []),
                notes_count=len(notes.get(doc["id"], [])), notes=notes.get(doc["id"], []),
                created_at=doc["created_at"], updated_at=doc["updated_at"],
            ) for doc in docs
        ]

    @staticmethod
    async def get_workspace(user_id: str, workspace_id: str) -> WorkspaceResponse:
        """
        Returns details of a single workspace by ID.
        """
        workspaces_col = WorkspaceController._get_workspaces_collection()
        notes_col = WorkspaceController._get_notes_collection()

        doc = await workspaces_col.find_one({"user_id": user_id, "id": workspace_id})
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.workspace_not_found",
            )

        return await WorkspaceController._populate_workspace_response(doc, workspaces_col, notes_col)

    @staticmethod
    async def update_workspace(
        user_id: str,
        workspace_id: str,
        payload: WorkspaceUpdate,
    ) -> WorkspaceResponse:
        """
        Updates a workspace:
        - name, color, icon
        - moves to a new parent_id (or to root level) with robust cycle detection
        """
        workspaces_col = WorkspaceController._get_workspaces_collection()
        notes_col = WorkspaceController._get_notes_collection()

        ws = await workspaces_col.find_one({"user_id": user_id, "id": workspace_id})
        if not ws:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.workspace_not_found",
            )

        update_fields = {}

        if payload.name is not None:
            update_fields["name"] = payload.name

        if payload.color is not None:
            update_fields["color"] = payload.color

        if payload.icon is not None:
            update_fields["icon"] = payload.icon

        if payload.update_parent:
            new_parent_id = payload.parent_id
            if new_parent_id:
                parent = await workspaces_col.find_one({"user_id": user_id, "id": new_parent_id})
                if not parent:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="error.parent_workspace_not_found",
                    )

                has_cycle = await WorkspaceController._check_cycle(
                    workspaces_col,
                    user_id,
                    workspace_id,
                    new_parent_id,
                )
                if has_cycle:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="error.workspace_cycle_detected",
                    )

            update_fields["parent_id"] = new_parent_id

        if not update_fields:
            return await WorkspaceController._populate_workspace_response(ws, workspaces_col, notes_col)

        now = datetime.now(timezone.utc)
        update_fields["updated_at"] = now

        await workspaces_col.update_one(
            {"user_id": user_id, "id": workspace_id},
            {"$set": update_fields},
        )

        updated_doc = await workspaces_col.find_one({"user_id": user_id, "id": workspace_id})
        logger.info("Workspace updated")

        return await WorkspaceController._populate_workspace_response(updated_doc, workspaces_col, notes_col)

    @staticmethod
    async def delete_workspace(
        user_id: str,
        workspace_id: str,
        payload: WorkspaceDeleteRequest,
    ) -> WorkspaceDeleteResponse:
        """
        Deletes a workspace with robust handling of contained child workspaces and notes:
        - strategy = 'cascade': recursively finds and deletes all child workspaces and notes.
        - strategy = 'move': moves all direct child workspaces and notes to target_parent_id (or root if None).
        """
        workspaces_col = WorkspaceController._get_workspaces_collection()
        notes_col = WorkspaceController._get_notes_collection()

        target_ws = await workspaces_col.find_one({"user_id": user_id, "id": workspace_id})
        if not target_ws:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="error.workspace_not_found",
            )

        now = datetime.now(timezone.utc)

        if payload.strategy == DeleteStrategy.MOVE:
            target_parent = payload.target_parent_id

            if target_parent:
                if target_parent == workspace_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="error.cannot_move_into_deleted_workspace",
                    )
                dest = await workspaces_col.find_one({"user_id": user_id, "id": target_parent})
                if not dest:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="error.destination_workspace_not_found",
                    )

                has_cycle = await WorkspaceController._check_cycle(
                    workspaces_col,
                    user_id,
                    workspace_id,
                    target_parent,
                )
                if has_cycle:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="error.cannot_move_into_child_workspace",
                    )

            move_ws_result = await workspaces_col.update_many(
                {"user_id": user_id, "parent_id": workspace_id},
                {"$set": {"parent_id": target_parent, "updated_at": now}},
            )

            move_notes_result = await notes_col.update_many(
                {"user_id": user_id, "workspace_id": workspace_id},
                {"$set": {"workspace_id": target_parent, "updated_at": now}},
            )

            await workspaces_col.delete_one({"user_id": user_id, "id": workspace_id})

            logger.info(
                "Workspace deleted using move strategy (moved_workspaces=%d, moved_notes=%d)",
                move_ws_result.modified_count,
                move_notes_result.modified_count,
            )

            return WorkspaceDeleteResponse(
                message="workspace.deleted_success",
                deleted_workspaces_count=1,
                deleted_notes_count=0,
                moved_workspaces_count=move_ws_result.modified_count,
                moved_notes_count=move_notes_result.modified_count,
            )

        descendant_ids = {workspace_id}
        queue = [workspace_id]

        while queue:
            current_id = queue.pop(0)
            children = await workspaces_col.find(
                {"user_id": user_id, "parent_id": current_id},
                {"id": 1},
            ).to_list(length=1000)

            for child in children:
                cid = child["id"]
                if cid not in descendant_ids:
                    descendant_ids.add(cid)
                    queue.append(cid)

        delete_notes_result = await notes_col.delete_many(
            {"user_id": user_id, "workspace_id": {"$in": list(descendant_ids)}},
        )

        delete_ws_result = await workspaces_col.delete_many(
            {"user_id": user_id, "id": {"$in": list(descendant_ids)}},
        )

        logger.info(
            "Workspace deleted using cascade strategy (deleted_workspaces=%d, deleted_notes=%d)",
            delete_ws_result.deleted_count,
            delete_notes_result.deleted_count,
        )

        return WorkspaceDeleteResponse(
            message="workspace.deleted_success",
            deleted_workspaces_count=delete_ws_result.deleted_count,
            deleted_notes_count=delete_notes_result.deleted_count,
            moved_workspaces_count=0,
            moved_notes_count=0,
        )

