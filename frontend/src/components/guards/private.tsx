import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "@/contexts/auth-context";
import Loading from "../blocks/loading";

interface PrivateGuardProps {
    redirectPath?: string;
}

export default function PrivateGuard({ redirectPath = "/welcome" }: PrivateGuardProps) {
    
    const { isAuthenticated, isLoading } = useAuthContext();

    if (isLoading) {
        return <Loading />;
    }

    if (!isAuthenticated) {
        return <Navigate to={redirectPath} replace />;
    }

    return <Outlet />;

}

