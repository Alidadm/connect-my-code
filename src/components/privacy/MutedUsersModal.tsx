import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { VolumeX, Loader2 } from "lucide-react";

interface MutedUser {
  id: string;
  muted_user_id: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

interface MutedUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MutedUsersModal = ({ open, onOpenChange }: MutedUsersModalProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unmuting, setUnmuting] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchMutedUsers();
    }
  }, [open, user]);

  const fetchMutedUsers = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: muted, error } = await supabase
        .from("muted_users")
        .select("id, muted_user_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (muted && muted.length > 0) {
        const userIds = muted.map(m => m.muted_user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, username")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        setMutedUsers(muted.map(m => ({
          ...m,
          profile: profileMap.get(m.muted_user_id)
        })));
      } else {
        setMutedUsers([]);
      }
    } catch (error) {
      console.error("Error fetching muted users:", error);
      toast.error(t("privacy.errorFetchingMuted", { defaultValue: "Failed to load muted accounts" }));
    } finally {
      setLoading(false);
    }
  };

  const handleUnmute = async (mutedUserId: string) => {
    if (!user) return;
    setUnmuting(mutedUserId);

    try {
      const { error } = await supabase
        .from("muted_users")
        .delete()
        .eq("user_id", user.id)
        .eq("muted_user_id", mutedUserId);

      if (error) throw error;

      setMutedUsers(prev => prev.filter(m => m.muted_user_id !== mutedUserId));
      toast.success(t("privacy.userUnmuted", { defaultValue: "User unmuted successfully" }));
    } catch (error) {
      console.error("Error unmuting user:", error);
      toast.error(t("privacy.errorUnmuting", { defaultValue: "Failed to unmute user" }));
    } finally {
      setUnmuting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <VolumeX className="w-5 h-5" />
            {t("privacy.mutedAccounts", { defaultValue: "Muted Accounts" })}
          </DialogTitle>
          <DialogDescription>
            {t("privacy.mutedUsersModalDesc", { defaultValue: "You won't see posts or notifications from muted accounts." })}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : mutedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <VolumeX className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t("privacy.noMutedUsers", { defaultValue: "You haven't muted anyone yet" })}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mutedUsers.map((muted) => (
                <div 
                  key={muted.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={muted.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {muted.profile?.display_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {muted.profile?.display_name || t("common.unknownUser", { defaultValue: "Unknown User" })}
                      </p>
                      {muted.profile?.username && (
                        <p className="text-sm text-muted-foreground">@{muted.profile.username}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnmute(muted.muted_user_id)}
                    disabled={unmuting === muted.muted_user_id}
                  >
                    {unmuting === muted.muted_user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t("privacy.unmute", { defaultValue: "Unmute" })
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
