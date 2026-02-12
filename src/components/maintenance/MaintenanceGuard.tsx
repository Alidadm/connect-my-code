import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";

const ALLOWED_PATHS = ["/under-construction", "/confirm-email", "/verify-email"];
const ADMIN_EMAIL = "alidadm@hotmail.com";

export const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenanceMode();
  const location = useLocation();

  if (authLoading || maintenanceLoading) return null;

  if (!isMaintenanceMode) return <>{children}</>;

  const isAllowed = ALLOWED_PATHS.some(p => location.pathname === p);
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isLoginPage = location.pathname === "/login";

  // Admin user bypasses all restrictions
  if (user?.email === ADMIN_EMAIL) return <>{children}</>;

  // Allow login page so admin can log in
  if (isLoginPage && !user) return <>{children}</>;

  // Non-admin logged-in users get redirected
  if (user && user.email !== ADMIN_EMAIL && !isAllowed) {
    return <Navigate to="/under-construction" replace />;
  }

  // Non-logged-in users on non-allowed pages get redirected
  if (!user && !isAllowed && !isLoginPage) {
    return <Navigate to="/under-construction" replace />;
  }

  return <>{children}</>;
};
