import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { UserX, Loader2 } from "lucide-react";

interface BlockedUser {
  id: string;
  blocked_user_id: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

interface BlockedUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BlockedUsersModal = ({ open, onOpenChange }: BlockedUsersModalProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchBlockedUsers();
    }
  }, [open, user]);

  const fetchBlockedUsers = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: blocked, error } = await supabase
        .from("blocked_users")
        .select("id, blocked_user_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (blocked && blocked.length > 0) {
        const userIds = blocked.map(b => b.blocked_user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, username")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        setBlockedUsers(blocked.map(b => ({
          ...b,
          profile: profileMap.get(b.blocked_user_id)
        })));
      } else {
        setBlockedUsers([]);
      }
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      toast.error(t("privacy.errorFetchingBlocked", { defaultValue: "Failed to load blocked users" }));
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedUserId: string) => {
    if (!user) return;
    setUnblocking(blockedUserId);

    try {
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("user_id", user.id)
        .eq("blocked_user_id", blockedUserId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(b => b.blocked_user_id !== blockedUserId));
      toast.success(t("privacy.userUnblocked", { defaultValue: "User unblocked successfully" }));
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error(t("privacy.errorUnblocking", { defaultValue: "Failed to unblock user" }));
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5" />
            {t("privacy.blockedUsers", { defaultValue: "Blocked Users" })}
          </DialogTitle>
          <DialogDescription>
            {t("privacy.blockedUsersModalDesc", { defaultValue: "Users you've blocked won't be able to see your profile or contact you." })}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserX className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t("privacy.noBlockedUsers", { defaultValue: "You haven't blocked anyone yet" })}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map((blocked) => (
                <div 
                  key={blocked.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={blocked.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {blocked.profile?.display_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {blocked.profile?.display_name || t("common.unknownUser", { defaultValue: "Unknown User" })}
                      </p>
                      {blocked.profile?.username && (
                        <p className="text-sm text-muted-foreground">@{blocked.profile.username}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblock(blocked.blocked_user_id)}
                    disabled={unblocking === blocked.blocked_user_id}
                  >
                    {unblocking === blocked.blocked_user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t("privacy.unblock", { defaultValue: "Unblock" })
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
