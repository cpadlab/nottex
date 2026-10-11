import { useCallback, useEffect, useState } from "react";
import authService from "@/services/auth";
import type { RegisterRequest, User } from "@/types/auth";

export interface UseAuthReturn {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    checkAuth: () => Promise<User | null>;
    loginWithToken: (token: string) => Promise<User | null>;
    register: (data: RegisterRequest) => Promise<User>;
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

    const register = useCallback(
        async (data: RegisterRequest): Promise<User> => {
            setIsLoading(true);
            try {
                const response = await authService.register(data);
                setUser(response.user);
                return response.user;
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
        register,
        logout,
    };
}

