import { useState, useEffect, forwardRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Loader2, Users } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface Friend {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface InviteFriendToSudokuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  difficulty: string;
  puzzle: number[][];
  solution: number[][];
  onGameCreated: (gameId: string) => void;
}

const InviteFriendToSudokuDialogContent = ({
  open,
  onOpenChange,
  difficulty,
  puzzle,
  solution,
  onGameCreated
}: InviteFriendToSudokuDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
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
      const friendIds = friendships?.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      ) || [];

      if (friendIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", friendIds);

      if (profilesError) throw profilesError;

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
        .from("sudoku_games")
        .insert({
          player_1: user.id,
          player_2: friendId,
          puzzle: puzzle as unknown as Json,
          solution: solution as unknown as Json,
          player_1_state: puzzle as unknown as Json,
          difficulty,
          status: "pending",
          is_multiplayer: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: t("games.inviteSent", { defaultValue: "Invite Sent!" }),
        description: t("games.waitingForFriend", { defaultValue: "Waiting for your friend to accept" }),
      });

      onOpenChange(false);
      onGameCreated(data.id);
    } catch (error) {
      console.error("Error creating game:", error);
      toast({
        title: t("games.error", { defaultValue: "Error" }),
        description: t("games.errorCreatingGame", { defaultValue: "Failed to create game" }),
        variant: "destructive",
      });
    } finally {
      setInviting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("games.inviteFriendToSudoku", { defaultValue: "Invite Friend to Sudoku" })}
          </DialogTitle>
          <DialogDescription>
            {t("games.selectFriendToChallenge", { defaultValue: "Select a friend to challenge to a Sudoku race!" })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t("games.noFriends", { defaultValue: "No friends to invite yet" })}</p>
            </div>
          ) : (
            <div className="space-y-2 p-1">
              {friends.map((friend) => (
                <div
                  key={friend.user_id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback>
                        {(friend.display_name || friend.username || "?")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{friend.display_name || friend.username}</p>
                      {friend.username && friend.display_name && (
                        <p className="text-xs text-muted-foreground">@{friend.username}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => inviteFriend(friend.user_id)}
                    disabled={inviting !== null}
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
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export const InviteFriendToSudokuDialog = forwardRef<HTMLDivElement, InviteFriendToSudokuDialogProps>(
  (props, ref) => {
    return <InviteFriendToSudokuDialogContent {...props} />;
  }
);

InviteFriendToSudokuDialog.displayName = "InviteFriendToSudokuDialog";
