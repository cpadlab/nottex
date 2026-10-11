import { api } from "@/lib/api";
import type {
    Workspace,
    WorkspaceCreate,
    WorkspaceDeleteRequest,
    WorkspaceDeleteResponse,
    WorkspaceUpdate,
} from "@/types/workspace";

export const workspaceService = {
     
    async getAll(): Promise<Workspace[]> {
        const response = await api.get<Workspace[]>("/workspaces");
        return response.data;
    },

    async getById(workspaceId: string): Promise<Workspace> {
        const response = await api.get<Workspace>(`/workspaces/${workspaceId}`);
        return response.data;
    },

    async create(data: WorkspaceCreate): Promise<Workspace> {
        const response = await api.post<Workspace>("/workspaces", data);
        return response.data;
    },

    async update(workspaceId: string, data: WorkspaceUpdate): Promise<Workspace> {
        const response = await api.put<Workspace>(`/workspaces/${workspaceId}`, data);
        return response.data;
    },

    async delete(workspaceId: string, data: WorkspaceDeleteRequest): Promise<WorkspaceDeleteResponse> {
        const response = await api.delete<WorkspaceDeleteResponse>(`/workspaces/${workspaceId}`, {
            data,
        });
        return response.data;
    },
    
};

export default workspaceService;

