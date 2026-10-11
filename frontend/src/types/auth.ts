export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    language: string;
    is_verified: boolean;
    is_totp_enabled?: boolean;
    last_login: string | null;
    created_at: string;
    updated_at: string;
}

export interface RegisterRequest {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    language?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
    totp_code?: string;
}

export interface AuthResponse {
    access_token?: string | null;
    token_type?: string;
    user?: User | null;
    requires_totp?: boolean;
    message?: string;
}

export interface VerifyEmailRequest {
    token: string;
}

export interface VerifyEmailResponse {
    message: string;
    is_verified: boolean;
}

export interface ResendVerificationRequest {
    email: string;
}

export interface ResendVerificationResponse {
    message: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ForgotPasswordResponse {
    message: string;
}

export interface ResetPasswordRequest {
    token: string;
    new_password: string;
}

export interface ResetPasswordResponse {
    message: string;
}

export interface TotpSetupResponse {
    secret: string;
    provisioning_uri: string;
}

export interface TotpVerifyRequest {
    code: string;
}

export interface TotpDisableRequest {
    password?: string;
    code?: string;
}

export interface TotpStatusResponse {
    is_enabled: boolean;
}

export interface UpdateProfileRequest {
    first_name: string;
    last_name: string;
}

export interface ChangePasswordRequest {
    current_password: string;
    new_password: string;
    totp_code?: string;
}

export interface ChangeEmailRequest {
    new_email: string;
    password: string;
    totp_code?: string;
}

export interface ChangeLanguageRequest {
    language: string;
}

export interface UserActionResponse {
    message: string;
    user?: User;
}

export interface RequestDeleteAccountRequest {
    password: string;
    totp_code?: string;
}

export interface ConfirmDeleteAccountRequest {
    token: string;
}


