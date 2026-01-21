import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import AdminRouteGuard from "./AdminRouteGuard";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <AdminRouteGuard>
      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </AdminRouteGuard>
  );
};
