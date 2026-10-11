import { api } from "@/lib/api";
import type {
    AuthResponse,
    ChangeEmailRequest,
    ChangeLanguageRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResendVerificationResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    TotpDisableRequest,
    TotpSetupResponse,
    TotpStatusResponse,
    TotpVerifyRequest,
    UpdateProfileRequest,
    User,
    UserActionResponse,
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

    async login(data: LoginRequest): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>("/auth/login", data);
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

    async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
        const response = await api.post<ForgotPasswordResponse>("/auth/forgot-password", data);
        return response.data;
    },

    async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
        const response = await api.post<ResetPasswordResponse>("/auth/reset-password", data);
        return response.data;
    },

    async me(): Promise<User> {
        const response = await api.get<User>("/auth/me");
        return response.data;
    },

    async updateProfile(data: UpdateProfileRequest): Promise<UserActionResponse> {
        const response = await api.put<UserActionResponse>("/auth/profile", data);
        return response.data;
    },

    async changePassword(data: ChangePasswordRequest): Promise<UserActionResponse> {
        const response = await api.put<UserActionResponse>("/auth/password", data);
        return response.data;
    },

    async changeEmail(data: ChangeEmailRequest): Promise<UserActionResponse> {
        const response = await api.put<UserActionResponse>("/auth/email", data);
        return response.data;
    },

    async changeLanguage(data: ChangeLanguageRequest): Promise<UserActionResponse> {
        const response = await api.put<UserActionResponse>("/auth/language", data);
        return response.data;
    },

    async getTotpStatus(): Promise<TotpStatusResponse> {
        const response = await api.get<TotpStatusResponse>("/auth/totp/status");
        return response.data;
    },

    async setupTotp(): Promise<TotpSetupResponse> {
        const response = await api.post<TotpSetupResponse>("/auth/totp/setup");
        return response.data;
    },

    async verifyTotp(data: TotpVerifyRequest): Promise<TotpStatusResponse> {
        const response = await api.post<TotpStatusResponse>("/auth/totp/verify", data);
        return response.data;
    },

    async disableTotp(data: TotpDisableRequest): Promise<TotpStatusResponse> {
        const response = await api.post<TotpStatusResponse>("/auth/totp/disable", data);
        return response.data;
    },

    logout(): void {
        localStorage.removeItem("access_token");
    },
};


export default authService;
