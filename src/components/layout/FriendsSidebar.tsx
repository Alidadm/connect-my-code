import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineIndicator } from "@/components/ui/online-indicator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchBatchPrivacySettings } from "@/hooks/useUserPrivacySettings";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Friend {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  isOnline: boolean;
  showOnlineStatus: boolean;
}

export const FriendsSidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      try {
        // Get accepted friendships
        const { data: friendships } = await supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq("status", "accepted")
          .limit(20);

        if (friendships && friendships.length > 0) {
          const friendIds = friendships.map(f => 
            f.requester_id === user.id ? f.addressee_id : f.requester_id
          );

          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, username, updated_at")
            .in("user_id", friendIds);

          if (profiles) {
            // Fetch privacy settings for all friends
            const privacySettings = await fetchBatchPrivacySettings(friendIds);
            
            // Consider users "online" if updated in last 15 minutes
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
            const friendProfiles = profiles.map(p => {
              const settings = privacySettings.get(p.user_id);
              const showOnlineStatus = settings?.show_online_status ?? true;
              
              return {
                user_id: p.user_id,
                display_name: p.display_name,
                avatar_url: p.avatar_url,
                username: p.username,
                isOnline: new Date(p.updated_at) > fifteenMinutesAgo,
                showOnlineStatus
              };
            }).sort((a, b) => {
              // Sort online users first (only if they show their status)
              const aOnline = a.showOnlineStatus && a.isOnline ? 1 : 0;
              const bOnline = b.showOnlineStatus && b.isOnline ? 1 : 0;
              return bOnline - aOnline;
            });

            setFriends(friendProfiles);
          }
        }
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user]);

  const handleFriendClick = (friend: Friend) => {
    if (friend.username) {
      navigate(`/${friend.username}`);
    }
  };

  if (!user || loading || friends.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed right-0 top-16 bottom-0 z-40 hidden xl:flex flex-col items-center py-4 bg-card/80 backdrop-blur-sm border-l transition-all duration-300 ease-in-out overflow-y-auto",
        isExpanded ? "w-48" : "w-14"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="space-y-3 px-2">
        {friends.map((friend) => (
          <div
            key={friend.user_id}
            onClick={() => handleFriendClick(friend)}
            className={cn(
              "flex items-center gap-3 cursor-pointer rounded-lg p-1.5 hover:bg-muted/50 transition-colors",
              isExpanded ? "w-full" : "justify-center"
            )}
          >
            <div className="relative flex-shrink-0">
              <Avatar className="h-9 w-9 ring-2 ring-background">
                <AvatarImage src={friend.avatar_url || undefined} alt={friend.display_name || "Friend"} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {(friend.display_name || friend.username || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {friend.showOnlineStatus && friend.isOnline && (
                <OnlineIndicator 
                  isOnline={true}
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-background" 
                />
              )}
            </div>
            
            {isExpanded && (
              <span className="text-sm font-medium truncate text-foreground/90">
                {friend.display_name || friend.username || "Friend"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
