import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import AdminRouteGuard from "./AdminRouteGuard";
import { AdminHeader } from "./AdminHeader";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export const AdminLayout = ({ children, title = "Admin" }: AdminLayoutProps) => {
  return (
    <AdminRouteGuard>
      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <AdminHeader title={title} />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminRouteGuard>
  );
};
