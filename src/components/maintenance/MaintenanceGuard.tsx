import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";

const ALLOWED_PATHS = ["/under-construction", "/login", "/signup", "/forgot-password", "/reset-password", "/confirm-email", "/verify-email"];

export const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenanceMode();
  const location = useLocation();

  if (authLoading || maintenanceLoading) return null;

  const isAllowed = ALLOWED_PATHS.some(p => location.pathname === p) || location.pathname.startsWith("/admin");

  if (isMaintenanceMode && !user && !isAllowed) {
    return <Navigate to="/under-construction" replace />;
  }

  return <>{children}</>;
};
