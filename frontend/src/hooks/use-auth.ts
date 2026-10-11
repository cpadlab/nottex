import { useCallback, useEffect, useState } from "react";
import authService from "@/services/auth";
import type { AuthResponse, LoginRequest, RegisterRequest, User } from "@/types/auth";

export interface UseAuthReturn {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    checkAuth: () => Promise<User | null>;
    loginWithToken: (token: string) => Promise<User | null>;
    login: (data: LoginRequest) => Promise<AuthResponse>;
    register: (data: RegisterRequest) => Promise<User | null>;
    logout: () => void;
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
                setUser(userObj);
                return userObj;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );


    const logout = useCallback(() => {
        authService.logout();
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
        logout,
    };
}

