import { api } from "@/lib/api";
import type {
    ListNotesParams,
    Note,
    NoteCreate,
    NoteDuplicateRequest,
    NoteShareRequest,
    NoteUnshareRequest,
    NoteUpdate,
    PaginatedNotesResponse,
    WorkspaceWithNotes,
} from "@/types/note";

export const noteService = {
    
    async list(params?: ListNotesParams): Promise<PaginatedNotesResponse> {
        const response = await api.get<PaginatedNotesResponse>("/notes", {
            params,
        });
        return response.data;
    },

    async listByWorkspaces(): Promise<WorkspaceWithNotes[]> {
        const response = await api.get<WorkspaceWithNotes[]>("/notes/by-workspaces");
        return response.data;
    },

    async getById(noteId: string): Promise<Note> {
        const response = await api.get<Note>(`/notes/${noteId}`);
        return response.data;
    },

    async create(data: NoteCreate): Promise<Note> {
        const response = await api.post<Note>("/notes", data);
        return response.data;
    },

    async update(noteId: string, data: NoteUpdate): Promise<Note> {
        const response = await api.put<Note>(`/notes/${noteId}`, data);
        return response.data;
    },

    async delete(noteId: string, permanent: boolean = false): Promise<{ message: string }> {
        const response = await api.delete<{ message: string }>(`/notes/${noteId}`, {
            params: { permanent },
        });
        return response.data;
    },

    async restore(noteId: string): Promise<Note> {
        const response = await api.post<Note>(`/notes/${noteId}/restore`);
        return response.data;
    },

    async duplicate(noteId: string, data?: NoteDuplicateRequest): Promise<Note> {
        const response = await api.post<Note>(`/notes/${noteId}/duplicate`, data || {});
        return response.data;
    },

    async share(noteId: string, data: NoteShareRequest): Promise<Note> {
        const response = await api.post<Note>(`/notes/${noteId}/share`, data);
        return response.data;
    },

    async unshare(noteId: string, data: NoteUnshareRequest): Promise<Note> {
        const response = await api.post<Note>(`/notes/${noteId}/unshare`, data);
        return response.data;
    },

    subscribeToUserEvents(
        onEvent: (data: any) => void,
        onError?: (err: any) => void
    ): () => void {
        const token = localStorage.getItem("access_token");
        const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
        const url = `${baseURL}/notes/events/user${token ? `?token=${encodeURIComponent(token)}` : ""}`;

        const eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                onEvent(parsed);
            } catch (e) {
                logger_error(e);
            }
        };

        eventSource.onerror = (err) => {
            if (onError) onError(err);
        };

        return () => {
            eventSource.close();
        };
    },

    subscribeToNoteEvents(
        noteId: string,
        onEvent: (data: any) => void,
        onError?: (err: any) => void
    ): () => void {
        const token = localStorage.getItem("access_token");
        const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
        const url = `${baseURL}/notes/${noteId}/events${token ? `?token=${encodeURIComponent(token)}` : ""}`;

        const eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                onEvent(parsed);
            } catch (e) {
                logger_error(e);
            }
        };

        eventSource.onerror = (err) => {
            if (onError) onError(err);
        };

        return () => {
            eventSource.close();
        };
    },
    
};

function logger_error(e: any) {
    if (import.meta.env.DEV) {
        console.error("SSE parse error", e);
    }
}

export default noteService;

