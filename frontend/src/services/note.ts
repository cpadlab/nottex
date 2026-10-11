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

    async emptyTrash(): Promise<{ message: string; count: number }> {
        const response = await api.delete<{ message: string; count: number }>("/notes/trash/empty");
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
        return subscribeToSse("/notes/events/user", onEvent, onError, true);
    },

    subscribeToNoteEvents(
        noteId: string,
        onEvent: (data: any) => void,
        onError?: (err: any) => void
    ): () => void {
        return subscribeToSse(`/notes/${encodeURIComponent(noteId)}/events`, onEvent, onError, false);
    },
};

function subscribeToSse(
    path: string,
    onEvent: (data: any) => void,
    onError: ((err: any) => void) | undefined,
    requireAuthentication: boolean,
): () => void {
    const baseURL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
    const url = new URL(`${baseURL}${path}`, window.location.origin);
    let stopped = false;
    let controller: AbortController | null = null;
    let retryTimer: number | undefined;

    const consume = async (response: Response, signal: AbortSignal) => {
        if (!response.body) throw new Error("SSE response has no readable body");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const dispatchFrames = (final = false) => {
            const frames = buffer.split(/\r?\n\r?\n/);
            buffer = final ? "" : (frames.pop() ?? "");
            for (const frame of frames) {
                const data = frame
                    .split(/\r?\n/)
                    .filter((line) => line.startsWith("data:"))
                    .map((line) => line.slice(5).replace(/^ /, ""))
                    .join("\n");
                if (!data) continue;
                try {
                    onEvent(JSON.parse(data));
                } catch (error) {
                    logger_error(error);
                }
            }
        };

        try {
            while (!signal.aborted) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                dispatchFrames();
            }
            buffer += decoder.decode();
            dispatchFrames(true);
        } finally {
            reader.releaseLock();
        }
    };

    const run = async () => {
        let retryDelay = 1000;
        while (!stopped) {
            const token = localStorage.getItem("access_token");
            if (requireAuthentication && !token) {
                onError?.(new Error("Authentication required for this event stream"));
                return;
            }

            const requestController = new AbortController();
            controller = requestController;
            try {
                const headers = new Headers({ Accept: "text/event-stream" });
                if (token) headers.set("Authorization", `Bearer ${token}`);
                const response = await fetch(url, {
                    method: "GET",
                    headers,
                    credentials: "omit",
                    cache: "no-store",
                    signal: requestController.signal,
                });
                if (!response.ok) {
                    const error = Object.assign(new Error(`SSE request failed (${response.status})`), {
                        status: response.status,
                    });
                    if (response.status === 401) localStorage.removeItem("access_token");
                    onError?.(error);
                    if ([400, 401, 403, 404].includes(response.status)) return;
                } else {
                    await consume(response, requestController.signal);
                    retryDelay = 1000;
                }
            } catch (error) {
                if (stopped || requestController.signal.aborted) return;
                onError?.(error);
            } finally {
                controller = null;
            }

            if (stopped) return;
            await new Promise<void>((resolve) => {
                retryTimer = window.setTimeout(resolve, retryDelay);
            });
            retryTimer = undefined;
            retryDelay = Math.min(retryDelay * 2, 30000);
        }
    };

    void run();
    return () => {
        stopped = true;
        controller?.abort();
        if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
}

function logger_error(e: any) {
    if (import.meta.env.DEV) {
        console.error("SSE parse error", e);
    }
}

export default noteService;

