export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    language: string;
    is_verified: boolean;
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

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
    message: string;
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

