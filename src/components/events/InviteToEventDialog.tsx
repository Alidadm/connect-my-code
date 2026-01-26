import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, UserPlus, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useInviteToEvent } from "@/hooks/useEvents";

interface Friend {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface InviteToEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

export const InviteToEventDialog = ({
  open,
  onOpenChange,
  eventId,
}: InviteToEventDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const inviteMutation = useInviteToEvent();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && user) {
      fetchFriends();
    }
  }, [open, user]);

  const fetchFriends = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Get accepted friendships
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      const friendIds =
        friendships?.map((f) =>
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        ) || [];

      if (friendIds.length === 0) {
        setFriends([]);
        setIsLoading(false);
        return;
      }

      // Get friend profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, username, avatar_url")
        .in("user_id", friendIds);

      // Get already invited users
      const { data: invitations } = await supabase
        .from("event_invitations")
        .select("invitee_id")
        .eq("event_id", eventId);

      const invitedIds = new Set(invitations?.map((i) => i.invitee_id) || []);

      // Filter out already invited friends
      const availableFriends = (profiles || []).filter(
        (p) => !invitedIds.has(p.user_id)
      );

      setFriends(availableFriends);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFriends = friends.filter(
    (friend) =>
      friend.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (userId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedIds(newSelected);
  };

  const handleInvite = async () => {
    if (selectedIds.size === 0) return;

    await inviteMutation.mutateAsync({
      eventId,
      inviteeIds: Array.from(selectedIds),
    });

    setSelectedIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {t("events.inviteFriends", { defaultValue: "Invite Friends" })}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("events.searchFriends", {
              defaultValue: "Search friends...",
            })}
            className="pl-9"
          />
        </div>

        {/* Friends list */}
        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {friends.length === 0
                ? t("events.noFriendsToInvite", {
                    defaultValue: "No friends to invite",
                  })
                : t("events.noFriendsFound", {
                    defaultValue: "No friends found",
                  })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => toggleSelection(friend.user_id)}
                >
                  <Checkbox
                    checked={selectedIds.has(friend.user_id)}
                    onCheckedChange={() => toggleSelection(friend.user_id)}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={friend.avatar_url || undefined} />
                    <AvatarFallback>
                      {friend.display_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {friend.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{friend.username}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size}{" "}
            {t("events.selected", { defaultValue: "selected" })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleInvite}
              disabled={selectedIds.size === 0 || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("events.sendInvites", { defaultValue: "Send Invites" })}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
