import { useCallback, useEffect, useState } from "react";
import authService from "@/services/auth";
import type {
    AuthResponse,
    ChangeEmailRequest,
    ChangeLanguageRequest,
    ChangePasswordRequest,
    ConfirmDeleteAccountRequest,
    LoginRequest,
    RegisterRequest,
    RequestDeleteAccountRequest,
    UpdateProfileRequest,
    User,
    UserActionResponse,
} from "@/types/auth";

export interface UseAuthReturn {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    checkAuth: () => Promise<User | null>;
    loginWithToken: (token: string) => Promise<User | null>;
    login: (data: LoginRequest) => Promise<AuthResponse>;
    register: (data: RegisterRequest) => Promise<User | null>;
    updateProfile: (data: UpdateProfileRequest) => Promise<UserActionResponse>;
    changePassword: (data: ChangePasswordRequest) => Promise<UserActionResponse>;
    changeEmail: (data: ChangeEmailRequest) => Promise<UserActionResponse>;
    changeLanguage: (data: ChangeLanguageRequest) => Promise<UserActionResponse>;
    requestDeleteAccount: (data: RequestDeleteAccountRequest) => Promise<UserActionResponse>;
    confirmDeleteAccount: (data: ConfirmDeleteAccountRequest) => Promise<UserActionResponse>;
    logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
    
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const checkAuth = useCallback(async (): Promise<User | null> => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            setUser(null);
            setIsLoading(false);
            return null;
        }

        try {
            setIsLoading(true);
            const currentUser = await authService.me();
            setUser(currentUser);
            return currentUser;
        } catch {
            localStorage.removeItem("access_token");
            setUser(null);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loginWithToken = useCallback(
        async (token: string): Promise<User | null> => {
            localStorage.setItem("access_token", token);
            return await checkAuth();
        },
        [checkAuth]
    );

    const login = useCallback(
        async (data: LoginRequest): Promise<AuthResponse> => {
            setIsLoading(true);
            try {
                const response = await authService.login(data);
                if (response.user) {
                    setUser(response.user);
                }
                return response;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const register = useCallback(
        async (data: RegisterRequest): Promise<User | null> => {
            setIsLoading(true);
            try {
                const response = await authService.register(data);
                const userObj = response.user ?? null;
                setUser(null);
                return userObj;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const updateProfile = useCallback(
        async (data: UpdateProfileRequest): Promise<UserActionResponse> => {
            const res = await authService.updateProfile(data);
            if (res.user) {
                setUser(res.user);
            }
            return res;
        },
        []
    );

    const changePassword = useCallback(
        async (data: ChangePasswordRequest): Promise<UserActionResponse> => {
            const response = await authService.changePassword(data);
            setUser(null);
            return response;
        },
        []
    );

    const changeEmail = useCallback(
        async (data: ChangeEmailRequest): Promise<UserActionResponse> => {
            const res = await authService.changeEmail(data);
            setUser(null);
            return res;
        },
        []
    );

    const changeLanguage = useCallback(
        async (data: ChangeLanguageRequest): Promise<UserActionResponse> => {
            const res = await authService.changeLanguage(data);
            if (res.user) {
                setUser(res.user);
            }
            return res;
        },
        []
    );

    const requestDeleteAccount = useCallback(
        async (data: RequestDeleteAccountRequest): Promise<UserActionResponse> => {
            return await authService.requestDeleteAccount(data);
        },
        []
    );

    const confirmDeleteAccount = useCallback(
        async (data: ConfirmDeleteAccountRequest): Promise<UserActionResponse> => {
            const res = await authService.confirmDeleteAccount(data);
            setUser(null);
            return res;
        },
        []
    );

    const logout = useCallback(async () => {
        await authService.logout();
        setUser(null);
    }, []);

    useEffect(() => {
        void checkAuth();
    }, [checkAuth]);

    return {
        user,
        isAuthenticated: !!user,
        isLoading,
        checkAuth,
        loginWithToken,
        login,
        register,
        updateProfile,
        changePassword,
        changeEmail,
        changeLanguage,
        requestDeleteAccount,
        confirmDeleteAccount,
        logout,
    };
}



