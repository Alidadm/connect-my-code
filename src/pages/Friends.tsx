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
import { Check, X, UserPlus, Users, Clock } from "lucide-react";
import { toast } from "sonner";

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

const Friends = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchData();
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
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">{t("nav.friends", { defaultValue: "Friends" })}</h1>
        </div>

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t("friends.pendingRequests", { defaultValue: "Pending Requests" })}
              {pendingRequests.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("friends.myFriends", { defaultValue: "My Friends" })}
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
                ) : pendingRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("friends.noPendingRequests", { defaultValue: "No pending friend requests" })}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
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
                ) : friends.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("friends.noFriends", { defaultValue: "No friends yet. Start connecting!" })}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {friends.map((friend) => (
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
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Friends;
