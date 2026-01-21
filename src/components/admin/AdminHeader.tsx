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
    <div className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded border-2 border-slate-300" />
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Admin Menu
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/admin/users/list")}>
              <User className="w-4 h-4 mr-2" />
              User Management
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/platform-posts")}>
              <Bell className="w-4 h-4 mr-2" />
              Platform Posts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/payouts")}>
              <Database className="w-4 h-4 mr-2" />
              Payouts
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-muted-foreground">
              <Shield className="w-4 h-4 mr-2" />
              Security Settings (Soon)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
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
