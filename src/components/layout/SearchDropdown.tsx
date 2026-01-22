import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Users, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { OnlineIndicator } from "@/components/ui/online-indicator";

interface Friend {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
}

export const SearchDropdown = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track online presence
  const { onlineUsers, fetchLastSeen } = useOnlinePresence();

  // Fetch last seen for friends when they change
  const friendUserIds = useMemo(() => friends.map(f => f.user_id), [friends]);
  
  useEffect(() => {
    if (friendUserIds.length > 0) {
      fetchLastSeen(friendUserIds);
    }
  }, [friendUserIds, fetchLastSeen]);

  // Fetch friends and groups when dropdown opens
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !isOpen) return;

      setLoading(true);

      try {
        // Fetch user's groups (up to 5)
        const { data: memberData } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", user.id)
          .limit(5);

        if (memberData && memberData.length > 0) {
          const groupIds = memberData.map((m) => m.group_id);
          const { data: groupsData } = await supabase
            .from("groups")
            .select("id, name, avatar_url")
            .in("id", groupIds)
            .limit(5);

          setGroups(groupsData || []);
        } else {
          setGroups([]);
        }

        // Fetch friends (accepted friendships)
        const { data: friendships } = await supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq("status", "accepted")
          .limit(10);

        if (friendships && friendships.length > 0) {
          const friendIds = friendships.map((f) =>
            f.requester_id === user.id ? f.addressee_id : f.requester_id
          );

          const { data: friendProfiles } = await supabase
            .from("safe_profiles")
            .select("user_id, display_name, avatar_url, username")
            .in("user_id", friendIds)
            .limit(10);

          setFriends(friendProfiles || []);
        } else {
          setFriends([]);
        }
      } catch (error) {
        console.error("Error fetching search data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter friends based on search query
  const filteredFriends = searchQuery
    ? friends.filter(
        (friend) =>
          friend.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : friends;

  // Filter groups based on search query
  const filteredGroups = searchQuery
    ? groups.filter((group) =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;

  // Calculate how many friends to show based on groups
  const maxFriendsToShow = groups.length > 0 ? Math.min(10, 10 - Math.min(groups.length, 5)) : 10;
  const displayedFriends = filteredFriends.slice(0, maxFriendsToShow);
  const displayedGroups = filteredGroups.slice(0, 5);

  const handleMemberClick = (username: string | null) => {
    if (username) {
      navigate(`/${username}`);
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`/groups/${groupId}`);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleFocus = () => {
    if (user) {
      setIsOpen(true);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md mx-2 sm:mx-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={t("common.search", { defaultValue: "Search" })}
          className="pl-10 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-full h-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={handleFocus}
        />
      </div>

      {/* Dropdown */}
      {isOpen && user && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              {t("common.loading", { defaultValue: "Loading..." })}
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {/* Groups Section */}
              {displayedGroups.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      {t("nav.groups", { defaultValue: "Groups" })}
                    </h4>
                  </div>
                  {displayedGroups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => handleGroupClick(group.id)}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={group.avatar_url || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-dolphy-blue to-dolphy-purple text-primary-foreground text-sm">
                          {getInitials(group.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("common.group", { defaultValue: "Group" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Friends Section */}
              {displayedFriends.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      {t("nav.friends", { defaultValue: "Friends" })}
                    </h4>
                  </div>
                  {displayedFriends.map((friend) => (
                    <div
                      key={friend.user_id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => handleMemberClick(friend.username)}
                    >
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={friend.avatar_url || ""} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-dolphy-purple text-primary-foreground text-sm">
                            {getInitials(friend.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <OnlineIndicator isOnline={onlineUsers.has(friend.user_id)} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {friend.display_name || t("common.unknownUser", { defaultValue: "Unknown User" })}
                        </p>
                        {friend.username && (
                          <p className="text-xs text-muted-foreground">@{friend.username}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {displayedGroups.length === 0 && displayedFriends.length === 0 && (
                <div className="p-6 text-center text-muted-foreground">
                  {searchQuery ? (
                    <p className="text-sm">
                      {t("common.noResults", { defaultValue: "No results found" })}
                    </p>
                  ) : (
                    <p className="text-sm">
                      {t("friends.noFriendsYet", { defaultValue: "No friends yet" })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
