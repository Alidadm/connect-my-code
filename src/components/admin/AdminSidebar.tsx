import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { 
  LayoutDashboard, Users, Megaphone, Wallet, Mail, LogOut, FileText, Trash2, Flag, Search, Calendar, MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const sidebarLinks = [
  { name: "Dashboard", path: "/adminindex", icon: LayoutDashboard },
  { name: "User List", path: "/admin/users/list", icon: Users },
  { name: "Admin Panel", path: "/adminindex", icon: Calendar },
  { name: "Messages", path: "/admin/messages", icon: MessageSquare },
  { name: "Reported Posts", path: "/admin/reported-posts", icon: Flag },
  { name: "Platform Posts", path: "/admin/platform-posts", icon: Megaphone },
  { name: "Payouts", path: "/admin/payouts", icon: Wallet },
  { name: "Email Templates", path: "/admin/email-templates", icon: Mail },
  { name: "Legal Pages", path: "/admin/legal-pages", icon: FileText },
  { name: "SEO Settings", path: "/admin/seo-settings", icon: Search },
  { name: "Data Cleanup", path: "/admin/data-cleanup", icon: Trash2 },
];

export const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingReportsCount, setPendingReportsCount] = useState(0);

  useEffect(() => {
    // Fetch initial count
    const fetchPendingCount = async () => {
      const { count } = await supabase
        .from('post_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingReportsCount(count || 0);
    };

    fetchPendingCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('pending-reports-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reports' },
        () => fetchPendingCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

      <nav className="flex-1 p-4 space-y-1">
        {sidebarLinks.map((link) => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;
          const showBadge = link.path === "/admin/reported-posts" && pendingReportsCount > 0;
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
              <span className="flex-1 text-left">{link.name}</span>
              {showBadge && (
                <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                  {pendingReportsCount > 99 ? '99+' : pendingReportsCount}
                </Badge>
              )}
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
