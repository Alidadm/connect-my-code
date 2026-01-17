import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, UserPlus, Gamepad2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Friend {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface InviteFriendToGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGameCreated: (gameId: string) => void;
}

export const InviteFriendToGameDialog = ({ open, onOpenChange, onGameCreated }: InviteFriendToGameDialogProps) => {
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
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (!friendships || friendships.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Extract friend IDs
      const friendIds = friendships.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      // Fetch friend profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", friendIds);

      setFriends(profiles || []);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
    }
  };

  const inviteFriend = async (friendId: string) => {
    if (!user) return;
    setInviting(friendId);

    try {
      const { data, error } = await supabase
        .from("tic_tac_toe_games")
        .insert({
          player_x: user.id,
          player_o: friendId,
          status: "pending"
        })
        .select("id")
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5" />
            {t("games.inviteFriend", { defaultValue: "Invite Friend to Play" })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t("games.noFriends", { defaultValue: "Add some friends to play with!" })}</p>
            </div>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.user_id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={friend.avatar_url || undefined} />
                    <AvatarFallback>
                      {(friend.display_name || friend.username || "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{friend.display_name || friend.username}</p>
                    {friend.username && friend.display_name && (
                      <p className="text-sm text-muted-foreground">@{friend.username}</p>
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
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
