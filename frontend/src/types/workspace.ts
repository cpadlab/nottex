export interface Workspace {
    id: string;
    user_id: string;
    name: string;
    color: string | null;
    icon: string | null;
    parent_id: string | null;
    child_workspaces: string[];
    notes_count: number;
    notes: string[];
    created_at: string;
    updated_at: string;
}

export interface WorkspaceCreate {
    name: string;
    color?: string | null;
    icon?: string | null;
    parent_id?: string | null;
}

export interface WorkspaceUpdate {
    name?: string;
    color?: string | null;
    icon?: string | null;
    parent_id?: string | null;
    update_parent?: boolean;
}

export type DeleteStrategy = "cascade" | "move";

export interface WorkspaceDeleteRequest {
    strategy: DeleteStrategy;
    target_parent_id?: string | null;
}

export interface WorkspaceDeleteResponse {
    message: string;
    deleted_workspaces_count: number;
    deleted_notes_count: number;
    moved_workspaces_count: number;
    moved_notes_count: number;
}

