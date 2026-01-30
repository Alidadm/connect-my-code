import { LogOut, Settings, Shield, ChevronDown, User, Bell, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminHeaderProps {
  title: string;
}

export const AdminHeader = ({ title }: AdminHeaderProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <div className="bg-slate-800/50 border-b border-slate-700/50 px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">{title}</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white">
              <Settings className="w-4 h-4" />
              Admin Menu
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
            <DropdownMenuItem onClick={() => navigate("/admin/users/list")} className="text-slate-200 focus:bg-slate-700 focus:text-white">
              <User className="w-4 h-4 mr-2" />
              User Management
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/platform-posts")} className="text-slate-200 focus:bg-slate-700 focus:text-white">
              <Bell className="w-4 h-4 mr-2" />
              Platform Posts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/payouts")} className="text-slate-200 focus:bg-slate-700 focus:text-white">
              <Database className="w-4 h-4 mr-2" />
              Payouts
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-slate-500">
              <Shield className="w-4 h-4 mr-2" />
              Security Settings (Soon)
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
