import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Friend {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface InviteFriendToMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGameCreated: (gameId: string) => void;
}

export const InviteFriendToMemoryDialog = ({
  open,
  onOpenChange,
  onGameCreated,
}: InviteFriendToMemoryDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchFriends();
    }
  }, [open, user]);

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get accepted friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (friendshipsError) throw friendshipsError;

      // Extract friend IDs
      const friendIds = friendships
        ?.map((f) =>
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        )
        .filter(Boolean);

      if (!friendIds || friendIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Fetch friend profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", friendIds);

      if (profilesError) throw profilesError;

      setFriends(profiles || []);
    } catch (error) {
      console.error("Error fetching friends:", error);
      toast.error(t("games.fetchFriendsError", { defaultValue: "Failed to load friends" }));
    } finally {
      setLoading(false);
    }
  };

  const inviteFriend = async (friendId: string) => {
    if (!user) return;
    setInviting(friendId);

    try {
      const { data, error } = await supabase
        .from("memory_match_games")
        .insert({
          player_1: user.id,
          player_2: friendId,
          current_turn: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(t("games.inviteSent", { defaultValue: "Game invite sent!" }));
      onOpenChange(false);
      onGameCreated(data.id);
    } catch (error) {
      console.error("Error creating game:", error);
      toast.error(t("games.inviteError", { defaultValue: "Failed to send invite" }));
    } finally {
      setInviting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {t("games.inviteToMemory", { defaultValue: "Invite to Memory Match" })}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("games.noFriends", { defaultValue: "No friends to invite. Add some friends first!" })}
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2 pr-4">
              {friends.map((friend) => (
                <div
                  key={friend.user_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.avatar_url || ""} />
                      <AvatarFallback>
                        {(friend.display_name || friend.username || "?").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {friend.display_name || friend.username || t("games.anonymous", { defaultValue: "Anonymous" })}
                      </p>
                      {friend.username && (
                        <p className="text-xs text-muted-foreground">@{friend.username}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => inviteFriend(friend.user_id)}
                    disabled={inviting === friend.user_id}
                  >
                    {inviting === friend.user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t("games.invite", { defaultValue: "Invite" })
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
