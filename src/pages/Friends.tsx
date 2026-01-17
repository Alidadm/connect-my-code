import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, UserPlus, Users, Clock, Sparkles, Search, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface FriendRequest {
  id: string;
  requester_id: string;
  created_at: string;
  profile: {
    user_id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

interface SentRequest {
  id: string;
  addressee_id: string;
  created_at: string;
  profile: {
    user_id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

interface Friend {
  id: string;
  friend_user_id: string;
  profile: {
    user_id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

interface Suggestion {
  user_id: string;
  profile: {
    user_id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  mutualFriendsCount: number;
  mutualFriendNames: string[];
}

const Friends = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Filter friends based on search query
  const filteredFriends = friends.filter((friend) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = getDisplayName(friend.profile).toLowerCase();
    const username = friend.profile?.username?.toLowerCase() || "";
    return name.includes(query) || username.includes(query);
  });

  // Filter suggestions based on search query
  const filteredSuggestions = suggestions.filter((suggestion) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = getDisplayName(suggestion.profile).toLowerCase();
    const username = suggestion.profile?.username?.toLowerCase() || "";
    return name.includes(query) || username.includes(query);
  });

  // Filter pending requests based on search query
  const filteredPendingRequests = pendingRequests.filter((request) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = getDisplayName(request.profile).toLowerCase();
    const username = request.profile?.username?.toLowerCase() || "";
    return name.includes(query) || username.includes(query);
  });

  // Filter sent requests based on search query
  const filteredSentRequests = sentRequests.filter((request) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = getDisplayName(request.profile).toLowerCase();
    const username = request.profile?.username?.toLowerCase() || "";
    return name.includes(query) || username.includes(query);
  });

  useEffect(() => {
    if (user) {
      fetchData();
      fetchSuggestions();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Fetch pending friend requests (where current user is the addressee)
      const { data: pendingData, error: pendingError } = await supabase
        .from("friendships")
        .select("id, requester_id, created_at")
        .eq("addressee_id", user.id)
        .eq("status", "pending");

      if (pendingError) throw pendingError;

      // Get profiles for pending requests
      if (pendingData && pendingData.length > 0) {
        const requesterIds = pendingData.map(r => r.requester_id);
        const { data: profiles } = await supabase
          .from("safe_profiles")
          .select("user_id, display_name, first_name, last_name, avatar_url, username")
          .in("user_id", requesterIds);

        const requestsWithProfiles = pendingData.map(request => ({
          ...request,
          profile: profiles?.find(p => p.user_id === request.requester_id) || null
        }));
        setPendingRequests(requestsWithProfiles);
      } else {
        setPendingRequests([]);
      }

      // Fetch sent friend requests (where current user is the requester)
      const { data: sentData, error: sentError } = await supabase
        .from("friendships")
        .select("id, addressee_id, created_at")
        .eq("requester_id", user.id)
        .eq("status", "pending");

      if (sentError) throw sentError;

      // Get profiles for sent requests
      if (sentData && sentData.length > 0) {
        const addresseeIds = sentData.map(r => r.addressee_id);
        const { data: profiles } = await supabase
          .from("safe_profiles")
          .select("user_id, display_name, first_name, last_name, avatar_url, username")
          .in("user_id", addresseeIds);

        const sentWithProfiles = sentData.map(request => ({
          ...request,
          profile: profiles?.find(p => p.user_id === request.addressee_id) || null
        }));
        setSentRequests(sentWithProfiles);
      } else {
        setSentRequests([]);
      }

      // Fetch accepted friendships
      const { data: friendsData, error: friendsError } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (friendsError) throw friendsError;

      // Get friend user IDs (the other person in the friendship)
      if (friendsData && friendsData.length > 0) {
        const friendUserIds = friendsData.map(f => 
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        );

        const { data: friendProfiles } = await supabase
          .from("safe_profiles")
          .select("user_id, display_name, first_name, last_name, avatar_url, username")
          .in("user_id", friendUserIds);

        const friendsWithProfiles = friendsData.map(friendship => {
          const friendUserId = friendship.requester_id === user.id 
            ? friendship.addressee_id 
            : friendship.requester_id;
          return {
            id: friendship.id,
            friend_user_id: friendUserId,
            profile: friendProfiles?.find(p => p.user_id === friendUserId) || null
          };
        });
        setFriends(friendsWithProfiles);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error("Error fetching friends data:", error);
      toast.error("Failed to load friends data");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRequest = async (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (error) throw error;

      toast.success(t("friends.requestConfirmed", { defaultValue: "Friend request confirmed!" }));
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error confirming friend request:", error);
      toast.error(t("friends.confirmFailed", { defaultValue: "Failed to confirm request" }));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const fetchSuggestions = async () => {
    if (!user) return;
    setSuggestionsLoading(true);

    try {
      // Get current user's friends
      const { data: myFriendships, error: myFriendsError } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (myFriendsError) throw myFriendsError;

      const myFriendIds = (myFriendships || []).map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      if (myFriendIds.length === 0) {
        setSuggestions([]);
        setSuggestionsLoading(false);
        return;
      }

      // Get friends of friends
      const { data: fofData, error: fofError } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(myFriendIds.map(id => `requester_id.eq.${id},addressee_id.eq.${id}`).join(","));

      if (fofError) throw fofError;

      // Get pending requests (to exclude them from suggestions)
      const { data: pendingData } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "pending")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      const pendingUserIds = new Set(
        (pendingData || []).flatMap(p => [p.requester_id, p.addressee_id])
      );

      // Count mutual friends for each potential suggestion
      const mutualFriendsMap = new Map<string, string[]>();
      
      (fofData || []).forEach(friendship => {
        const friendId = myFriendIds.includes(friendship.requester_id) 
          ? friendship.requester_id 
          : friendship.addressee_id;
        const suggestedId = friendship.requester_id === friendId 
          ? friendship.addressee_id 
          : friendship.requester_id;

        // Skip if it's the current user, already a friend, or has pending request
        if (
          suggestedId === user.id || 
          myFriendIds.includes(suggestedId) ||
          pendingUserIds.has(suggestedId)
        ) {
          return;
        }

        if (!mutualFriendsMap.has(suggestedId)) {
          mutualFriendsMap.set(suggestedId, []);
        }
        mutualFriendsMap.get(suggestedId)!.push(friendId);
      });

      // Get unique suggested user IDs, sorted by mutual friend count
      const suggestedUserIds = Array.from(mutualFriendsMap.keys())
        .sort((a, b) => mutualFriendsMap.get(b)!.length - mutualFriendsMap.get(a)!.length)
        .slice(0, 10); // Limit to top 10

      if (suggestedUserIds.length === 0) {
        setSuggestions([]);
        setSuggestionsLoading(false);
        return;
      }

      // Fetch profiles for suggested users
      const { data: suggestedProfiles } = await supabase
        .from("safe_profiles")
        .select("user_id, display_name, first_name, last_name, avatar_url, username")
        .in("user_id", suggestedUserIds);

      // Fetch profiles for mutual friends (to show names)
      const allMutualFriendIds = [...new Set(Array.from(mutualFriendsMap.values()).flat())];
      const { data: mutualFriendProfiles } = await supabase
        .from("safe_profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", allMutualFriendIds);

      const getMutualFriendName = (userId: string) => {
        const profile = mutualFriendProfiles?.find(p => p.user_id === userId);
        if (!profile) return "Unknown";
        return profile.display_name || 
          (profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : profile.first_name) || 
          "Unknown";
      };

      const suggestionsWithProfiles: Suggestion[] = suggestedUserIds
        .map(userId => {
          const profile = suggestedProfiles?.find(p => p.user_id === userId);
          if (!profile) return null;
          
          const mutualFriendIds = mutualFriendsMap.get(userId) || [];
          return {
            user_id: userId,
            profile,
            mutualFriendsCount: mutualFriendIds.length,
            mutualFriendNames: mutualFriendIds.slice(0, 3).map(getMutualFriendName),
          };
        })
        .filter((s): s is Suggestion => s !== null);

      setSuggestions(suggestionsWithProfiles);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    if (!user) return;
    
    setProcessingIds(prev => new Set(prev).add(userId));
    
    try {
      const { error } = await supabase
        .from("friendships")
        .insert({
          requester_id: user.id,
          addressee_id: userId,
          status: "pending",
        });

      if (error) throw error;

      toast.success(t("friends.requestSent", { defaultValue: "Friend request sent!" }));
      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.user_id !== userId));
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error(t("friends.sendFailed", { defaultValue: "Failed to send friend request" }));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast.success(t("friends.requestDeleted", { defaultValue: "Friend request deleted" }));
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error deleting friend request:", error);
      toast.error(t("friends.deleteFailed", { defaultValue: "Failed to delete request" }));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleCancelSentRequest = async (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast.success(t("friends.requestCanceled", { defaultValue: "Friend request canceled" }));
      setSentRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error("Error canceling friend request:", error);
      toast.error(t("friends.cancelFailed", { defaultValue: "Failed to cancel request" }));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    setProcessingIds(prev => new Set(prev).add(friendshipId));
    
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;

      toast.success(t("friends.friendRemoved", { defaultValue: "Friend removed" }));
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error(t("friends.removeFailed", { defaultValue: "Failed to remove friend" }));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(friendshipId);
        return next;
      });
    }
  };

  const getDisplayName = (profile: FriendRequest["profile"] | Friend["profile"]) => {
    if (!profile) return "Unknown User";
    if (profile.display_name) return profile.display_name;
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile.first_name) return profile.first_name;
    return profile.username || "Unknown User";
  };

  const getInitials = (profile: FriendRequest["profile"] | Friend["profile"]) => {
    if (!profile) return "?";
    const name = getDisplayName(profile);
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const navigateToProfile = (username: string | null | undefined) => {
    if (username) {
      navigate(`/${username}`);
    }
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">{t("nav.friends", { defaultValue: "Friends" })}</h1>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("friends.searchPlaceholder", { defaultValue: "Search friends..." })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">{t("friends.pendingRequests", { defaultValue: "Pending" })}</span>
              <span className="sm:hidden">{t("friends.pending", { defaultValue: "Pending" })}</span>
              {pendingRequests.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{t("friends.sentRequests", { defaultValue: "Sent" })}</span>
              <span className="sm:hidden">{t("friends.sent", { defaultValue: "Sent" })}</span>
              {sentRequests.length > 0 && (
                <span className="text-muted-foreground text-xs">({sentRequests.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t("friends.myFriends", { defaultValue: "Friends" })}</span>
              <span className="sm:hidden">{t("friends.friends", { defaultValue: "Friends" })}</span>
              <span className="text-muted-foreground text-xs">({friends.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  {t("friends.friendRequests", { defaultValue: "Friend Requests" })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                      </div>
                    ))}
                  </div>
                ) : filteredPendingRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{searchQuery.trim() 
                      ? t("friends.noSearchResults", { defaultValue: "No results found" })
                      : t("friends.noPendingRequests", { defaultValue: "No pending friend requests" })
                    }</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPendingRequests.map((request) => (
                      <div 
                        key={request.id} 
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <Avatar 
                          className="h-12 w-12 cursor-pointer"
                          onClick={() => navigateToProfile(request.profile?.username)}
                        >
                          <AvatarImage src={request.profile?.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(request.profile)}</AvatarFallback>
                        </Avatar>
                        
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigateToProfile(request.profile?.username)}
                        >
                          <p className="font-semibold truncate hover:underline">
                            {getDisplayName(request.profile)}
                          </p>
                          {request.profile?.username && (
                            <p className="text-sm text-muted-foreground">@{request.profile.username}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleConfirmRequest(request.id)}
                            disabled={processingIds.has(request.id)}
                            className="gap-1"
                          >
                            <Check className="h-4 w-4" />
                            {t("friends.confirm", { defaultValue: "Confirm" })}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteRequest(request.id)}
                            disabled={processingIds.has(request.id)}
                            className="gap-1"
                          >
                            <X className="h-4 w-4" />
                            {t("common.delete", { defaultValue: "Delete" })}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="friends" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t("friends.myFriends", { defaultValue: "My Friends" })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{searchQuery.trim() 
                      ? t("friends.noSearchResults", { defaultValue: "No results found" })
                      : t("friends.noFriends", { defaultValue: "No friends yet. Start connecting!" })
                    }</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredFriends.map((friend) => (
                      <div 
                        key={friend.id} 
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <Avatar 
                          className="h-12 w-12 cursor-pointer"
                          onClick={() => navigateToProfile(friend.profile?.username)}
                        >
                          <AvatarImage src={friend.profile?.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(friend.profile)}</AvatarFallback>
                        </Avatar>
                        
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigateToProfile(friend.profile?.username)}
                        >
                          <p className="font-semibold truncate hover:underline">
                            {getDisplayName(friend.profile)}
                          </p>
                          {friend.profile?.username && (
                            <p className="text-sm text-muted-foreground">@{friend.profile.username}</p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveFriend(friend.id)}
                          disabled={processingIds.has(friend.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t("friends.remove", { defaultValue: "Remove" })}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sent" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  {t("friends.sentRequests", { defaultValue: "Sent Requests" })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-9 w-20" />
                      </div>
                    ))}
                  </div>
                ) : filteredSentRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{searchQuery.trim() 
                      ? t("friends.noSearchResults", { defaultValue: "No results found" })
                      : t("friends.noSentRequests", { defaultValue: "No pending sent requests" })
                    }</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSentRequests.map((request) => (
                      <div 
                        key={request.id} 
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <Avatar 
                          className="h-12 w-12 cursor-pointer"
                          onClick={() => navigateToProfile(request.profile?.username)}
                        >
                          <AvatarImage src={request.profile?.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(request.profile)}</AvatarFallback>
                        </Avatar>
                        
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigateToProfile(request.profile?.username)}
                        >
                          <p className="font-semibold truncate hover:underline">
                            {getDisplayName(request.profile)}
                          </p>
                          {request.profile?.username && (
                            <p className="text-sm text-muted-foreground">@{request.profile.username}</p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelSentRequest(request.id)}
                          disabled={processingIds.has(request.id)}
                          className="gap-1"
                        >
                          <X className="h-4 w-4" />
                          {t("friends.cancel", { defaultValue: "Cancel" })}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* People You May Know Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {t("friends.peopleYouMayKnow", { defaultValue: "People You May Know" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suggestionsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                ))}
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{searchQuery.trim() 
                  ? t("friends.noSearchResults", { defaultValue: "No results found" })
                  : t("friends.noSuggestions", { defaultValue: "No suggestions yet. Add more friends to discover new connections!" })
                }</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredSuggestions.map((suggestion) => (
                  <div 
                    key={suggestion.user_id} 
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Avatar 
                      className="h-12 w-12 cursor-pointer"
                      onClick={() => navigateToProfile(suggestion.profile.username)}
                    >
                      <AvatarImage src={suggestion.profile.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(suggestion.profile)}</AvatarFallback>
                    </Avatar>
                    
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigateToProfile(suggestion.profile.username)}
                    >
                      <p className="font-semibold truncate hover:underline">
                        {getDisplayName(suggestion.profile)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>
                          {suggestion.mutualFriendsCount} {t("friends.mutualFriends", { defaultValue: "mutual friends" })}
                        </span>
                      </div>
                      {suggestion.mutualFriendNames.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {suggestion.mutualFriendNames.join(", ")}
                          {suggestion.mutualFriendsCount > 3 && ` +${suggestion.mutualFriendsCount - 3}`}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleSendFriendRequest(suggestion.user_id)}
                      disabled={processingIds.has(suggestion.user_id)}
                      className="gap-1"
                    >
                      <UserPlus className="h-4 w-4" />
                      {t("friends.add", { defaultValue: "Add" })}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Friends;
