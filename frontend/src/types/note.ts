export type NotePermission = "read" | "write";

export interface NoteCollaborator {
    user_id: string;
    email: string;
    permission: NotePermission;
    added_at: string;
}

export interface Note {
    id: string;
    user_id: string;
    title: string;
    content: string;
    color: string | null;
    is_pinned: boolean;
    workspace_id: string | null;
    tags: string[];
    is_public: boolean;
    collaborators: NoteCollaborator[];
    version: number;
    created_at: string;
    updated_at: string;
}

export interface NoteCreate {
    title?: string;
    content?: string;
    color?: string | null;
    is_pinned?: boolean;
    workspace_id?: string | null;
    tags?: string[];
    is_public?: boolean;
}

export interface NoteUpdate {
    title?: string;
    content?: string;
    color?: string | null;
    is_pinned?: boolean;
    workspace_id?: string | null;
    update_workspace?: boolean;
    tags?: string[];
    is_public?: boolean;
}

export interface NoteShareRequest {
    email: string;
    permission?: NotePermission;
}

export interface NoteUnshareRequest {
    email: string;
}

export interface PaginatedNotesResponse {
    items: Note[];
    total: number;
    page: number;
    page_size: number;
    pages: number;
}

export interface WorkspaceWithNotes {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    parent_id: string | null;
    notes: Note[];
    child_workspaces: string[];
    created_at: string;
    updated_at: string;
}

export interface ListNotesParams {
    workspace_id?: string;
    is_pinned?: boolean;
    tag?: string;
    search?: string;
    sort_by?: "updated_at" | "created_at" | "title";
    sort_order?: 1 | -1;
    page?: number;
    page_size?: number;
}

