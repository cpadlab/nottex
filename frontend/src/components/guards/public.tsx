import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "@/contexts/auth-context";
import Loading from "../blocks/loading";

interface PublicGuardProps {
    redirectPath?: string;
}

export default function PublicGuard({ redirectPath = "/notes" }: PublicGuardProps) {
    
    const { isAuthenticated, isLoading } = useAuthContext();

    if (isLoading) {
        return <Loading />;
    }

    if (isAuthenticated) {
        return <Navigate to={redirectPath} replace />;
    }

    return <Outlet />;

}

