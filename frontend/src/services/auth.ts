import { api } from "@/lib/api";
import type {
    AuthResponse,
    RegisterRequest,
    ResendVerificationRequest,
    ResendVerificationResponse,
    User,
    VerifyEmailRequest,
    VerifyEmailResponse,
} from "@/types/auth";

export const authService = {
    
    async register(data: RegisterRequest): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>("/auth/register", data);
        if (response.data.access_token) {
            localStorage.setItem("access_token", response.data.access_token);
        }
        return response.data;
    },

    async verifyEmail(data: VerifyEmailRequest): Promise<VerifyEmailResponse> {
        const response = await api.post<VerifyEmailResponse>("/auth/verify-email", data);
        return response.data;
    },

    async resendVerification(data: ResendVerificationRequest): Promise<ResendVerificationResponse> {
        const response = await api.post<ResendVerificationResponse>("/auth/resend-verification", data);
        return response.data;
    },

    async me(): Promise<User> {
        const response = await api.get<User>("/auth/me");
        return response.data;
    },

    logout(): void {
        localStorage.removeItem("access_token");
    },
    
};

export default authService;

