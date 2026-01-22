import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Users, Megaphone, Video, Wallet, Mail, LogOut, FileText, Trash2, Flag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sidebarLinks = [
  { name: "Dashboard", path: "/adminindex", icon: LayoutDashboard },
  { name: "User List", path: "/admin/users/list", icon: Users },
  { name: "Reported Posts", path: "/admin/reported-posts", icon: Flag },
  { name: "Platform Posts", path: "/admin/platform-posts", icon: Megaphone },
  { name: "Short Videos", path: "/admin/short-videos", icon: Video },
  { name: "Payouts", path: "/admin/payouts", icon: Wallet },
  { name: "Email Templates", path: "/admin/email-templates", icon: Mail },
  { name: "Legal Pages", path: "/admin/legal-pages", icon: FileText },
  { name: "Data Cleanup", path: "/admin/data-cleanup", icon: Trash2 },
];

export const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-slate-900 min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <button 
          onClick={() => navigate("/adminindex")}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-white font-semibold text-lg">Admin Panel</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {sidebarLinks.map((link) => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {link.name}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};
