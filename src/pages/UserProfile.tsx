import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  MapPin, Calendar, Users, 
  MessageCircle, UserPlus, MoreHorizontal, ArrowLeft,
  CheckCircle2, Camera, UserCheck, Clock, UserMinus, Ban, VolumeX, Volume2, UserX, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CoverEditor } from "@/components/cover/CoverEditor";
import { AvatarEditor } from "@/components/avatar/AvatarEditor";
import { ProfileTabContent } from "@/components/feed/ProfileTabContent";
import { PostCard } from "@/components/feed/PostCard";
import { useBlockMute } from "@/hooks/useBlockMute";
import { useUserPrivacySettings } from "@/hooks/useUserPrivacySettings";
import { useFavorites } from "@/hooks/useFavorites";
import { useProfileBirthdayConfetti } from "@/hooks/useProfileBirthdayConfetti";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { MessagesSheet } from "@/components/messages/MessagesSheet";

type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "accepted";
type ProfileTab = "posts" | "photos" | "videos" | "friends" | "mutual";

interface PublicProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  country: string | null;
  is_verified: boolean | null;
  created_at: string;
}

interface FriendProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
}

// Country code to name mapping
const countryNames: Record<string, string> = {
  US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
  DE: "Germany", FR: "France", ES: "Spain", IT: "Italy", JP: "Japan",
  CN: "China", IN: "India", BR: "Brazil", MX: "Mexico", NL: "Netherlands",
  SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", PL: "Poland",
  RU: "Russia", KR: "South Korea", SG: "Singapore", HK: "Hong Kong",
  NZ: "New Zealand", IE: "Ireland", CH: "Switzerland", AT: "Austria",
  BE: "Belgium", PT: "Portugal", GR: "Greece", CZ: "Czech Republic",
  HU: "Hungary", RO: "Romania", UA: "Ukraine", ZA: "South Africa",
  AR: "Argentina", CL: "Chile", CO: "Colombia", PE: "Peru", VE: "Venezuela",
  PH: "Philippines", TH: "Thailand", MY: "Malaysia", ID: "Indonesia",
  VN: "Vietnam", PK: "Pakistan", BD: "Bangladesh", EG: "Egypt", NG: "Nigeria",
  KE: "Kenya", GH: "Ghana", MA: "Morocco", SA: "Saudi Arabia", AE: "UAE",
  IL: "Israel", TR: "Turkey", TW: "Taiwan",
};

const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [blockedByOwner, setBlockedByOwner] = useState(false);
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>("none");
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendsList, setFriendsList] = useState<FriendProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [mutualFriends, setMutualFriends] = useState<FriendProfile[]>([]);
  const [loadingMutualFriends, setLoadingMutualFriends] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");

  // Block/Mute hook
  const { isBlocked, isMuted, blockUser, muteUser, loading: blockMuteLoading } = useBlockMute(profile?.user_id);
  
  // Favorites hook
  const { isFavorite, toggleFavorite, loading: favoriteLoading } = useFavorites(profile?.user_id);
  
  // Privacy settings hook - check if user allows DMs
  const { settings: profilePrivacySettings } = useUserPrivacySettings(profile?.user_id);
  
  // Birthday confetti hook - triggers once per day when visiting a birthday profile
  useProfileBirthdayConfetti(profile?.user_id);
  
  const { data: userPosts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["user-posts", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      
      // Fetch posts where user is the author OR posts made on their wall
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("*")
        .or(`user_id.eq.${profile.user_id},wall_user_id.eq.${profile.user_id}`)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      if (!postsData || postsData.length === 0) return [];
      
      // Fetch author profiles for all posts (including wall posts from other users)
      const authorIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, is_verified")
        .in("user_id", authorIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      
      // Attach author profiles to posts
      return postsData.map(post => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || undefined
      }));
    },
    enabled: !!profile?.user_id && activeTab === "posts",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      // Reset state for fresh fetch (important when auth/session is restored after first render)
      setLoading(true);
      setNotFound(false);
      setProfile(null);

      if (!username) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Use safe_profiles view to access public profile data (profiles table has RLS restricting to own profile only)
        const { data, error } = await supabase
          .from("safe_profiles")
          .select(
            "user_id, username, display_name, avatar_url, cover_url, bio, location, country, is_verified, created_at"
          )
          .eq("username", username.toLowerCase())
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
          setNotFound(true);
          setProfile(null);
        } else if (!data) {
          setNotFound(true);
          setProfile(null);
        } else {
          setNotFound(false);
          setProfile(data);
          fetchUserStats(data.user_id);
          // Check if profile owner has blocked the current user
          if (user && user.id !== data.user_id) {
            checkIfBlockedByOwner(data.user_id);
          }
        }
      } catch (err) {
        console.error("Error:", err);
        setNotFound(true);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    const checkIfBlockedByOwner = async (profileOwnerId: string) => {
      if (!user) return;
      
      const { data } = await supabase
        .from("blocked_users")
        .select("id")
        .eq("user_id", profileOwnerId)
        .eq("blocked_user_id", user.id)
        .maybeSingle();
      
      setBlockedByOwner(!!data);
    };

    const fetchUserStats = async (userId: string) => {
      const [friendsResult, postsResult] = await Promise.all([
        supabase
          .from("friendships")
          .select("id", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
      ]);

      if (friendsResult.count !== null) {
        setFriendsCount(friendsResult.count);
      }
      if (postsResult.count !== null) {
        setPostsCount(postsResult.count);
      }
    };

    fetchProfile();
  }, [username, user]);

  // Fetch mutual friends when viewing someone else's profile
  useEffect(() => {
    const fetchMutualFriends = async () => {
      if (!user || !profile || user.id === profile.user_id) {
        setMutualFriends([]);
        return;
      }

      setLoadingMutualFriends(true);
      try {
        const { data: myFriendships } = await supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        const { data: theirFriendships } = await supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${profile.user_id},addressee_id.eq.${profile.user_id}`);

        if (!myFriendships || !theirFriendships) {
          setMutualFriends([]);
          return;
        }

        const myFriendIds = new Set(
          myFriendships.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
        );

        const theirFriendIds = theirFriendships.map(f => 
          f.requester_id === profile.user_id ? f.addressee_id : f.requester_id
        );

        const mutualFriendIds = theirFriendIds.filter(id => myFriendIds.has(id));

        if (mutualFriendIds.length === 0) {
          setMutualFriends([]);
          return;
        }

        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url, is_verified")
          .in("user_id", mutualFriendIds);

        setMutualFriends(profiles || []);
      } catch (error) {
        console.error("Error fetching mutual friends:", error);
        setMutualFriends([]);
      } finally {
        setLoadingMutualFriends(false);
      }
    };

    fetchMutualFriends();
  }, [user, profile]);

  // Check friendship status
  useEffect(() => {
    const checkFriendshipStatus = async () => {
      if (!user || !profile || user.id === profile.user_id) {
        setFriendshipStatus("none");
        setFriendshipId(null);
        return;
      }

      const { data, error } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${profile.user_id}),and(requester_id.eq.${profile.user_id},addressee_id.eq.${user.id})`)
        .maybeSingle();

      if (error || !data) {
        setFriendshipStatus("none");
        setFriendshipId(null);
        return;
      }

      setFriendshipId(data.id);

      if (data.status === "accepted") {
        setFriendshipStatus("accepted");
      } else if (data.status === "pending") {
        if (data.requester_id === user.id) {
          setFriendshipStatus("pending_sent");
        } else {
          setFriendshipStatus("pending_received");
        }
      } else {
        setFriendshipStatus("none");
        setFriendshipId(null);
      }
    };

    checkFriendshipStatus();
  }, [user, profile]);

  const handleSendFriendRequest = async () => {
    if (!user || !profile) return;

    setFriendActionLoading(true);
    try {
      const { data, error } = await supabase
        .from("friendships")
        .insert({
          requester_id: user.id,
          addressee_id: profile.user_id,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) {
        toast.error(t("friends.errorSending", { defaultValue: "Failed to send friend request" }));
      } else {
        setFriendshipStatus("pending_sent");
        setFriendshipId(data.id);
        toast.success(t("friends.requestSent", { defaultValue: "Friend request sent!" }));
      }
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!friendshipId) return;

    setFriendActionLoading(true);
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) {
        toast.error(t("friends.errorCanceling", { defaultValue: "Failed to cancel request" }));
      } else {
        setFriendshipStatus("none");
        setFriendshipId(null);
        toast.success(t("friends.requestCanceled", { defaultValue: "Friend request canceled" }));
      }
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!friendshipId) return;

    setFriendActionLoading(true);
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", friendshipId);

      if (error) {
        toast.error(t("friends.errorAccepting", { defaultValue: "Failed to accept request" }));
      } else {
        setFriendshipStatus("accepted");
        toast.success(t("friends.requestAccepted", { defaultValue: "Friend request accepted!" }));
      }
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!friendshipId) return;

    setFriendActionLoading(true);
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) {
        toast.error(t("friends.errorUnfriending", { defaultValue: "Failed to unfriend" }));
      } else {
        setFriendshipStatus("none");
        setFriendshipId(null);
        toast.success(t("friends.unfriended", { defaultValue: "Unfriended successfully" }));
      }
    } finally {
      setFriendActionLoading(false);
    }
  };

  const renderFriendButton = () => {
    if (!user) {
      return (
        <Link to="/login">
          <Button className="dolphy-gradient">
            <UserPlus className="w-4 h-4 mr-2" />
            {t("friends.addFriend", { defaultValue: "Add Friend" })}
          </Button>
        </Link>
      );
    }

    switch (friendshipStatus) {
      case "accepted":
        return (
          <Button 
            variant="outline" 
            onClick={handleUnfriend}
            disabled={friendActionLoading}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <UserMinus className="w-4 h-4 mr-2" />
            {t("friends.unfriend", { defaultValue: "Unfriend" })}
          </Button>
        );
      case "pending_sent":
        return (
          <Button 
            variant="outline" 
            onClick={handleCancelFriendRequest}
            disabled={friendActionLoading}
          >
            <Clock className="w-4 h-4 mr-2" />
            {t("friends.pendingRequest", { defaultValue: "Request Sent" })}
          </Button>
        );
      case "pending_received":
        return (
          <Button 
            className="dolphy-gradient"
            onClick={handleAcceptFriendRequest}
            disabled={friendActionLoading}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            {t("friends.acceptRequest", { defaultValue: "Accept Request" })}
          </Button>
        );
      default:
        return (
          <Button 
            className="dolphy-gradient"
            onClick={handleSendFriendRequest}
            disabled={friendActionLoading}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {t("friends.addFriend", { defaultValue: "Add Friend" })}
          </Button>
        );
    }
  };

  const handleOpenFriendsModal = async () => {
    if (!profile) return;
    setShowFriendsModal(true);
    setLoadingFriends(true);

    try {
      const { data: friendships, error } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${profile.user_id},addressee_id.eq.${profile.user_id}`);

      if (error) {
        console.error("Error fetching friendships:", error);
        return;
      }

      const friendIds = friendships.map(f => 
        f.requester_id === profile.user_id ? f.addressee_id : f.requester_id
      );

      if (friendIds.length === 0) {
        setFriendsList([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, is_verified")
        .in("user_id", friendIds);

      if (profilesError) {
        console.error("Error fetching friend profiles:", profilesError);
        return;
      }

      setFriendsList(profiles || []);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleFriendClick = (friendUsername: string | null) => {
    if (friendUsername) {
      setShowFriendsModal(false);
      navigate(`/${friendUsername}`);
    }
  };

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: "posts", label: t("feed.posts", { defaultValue: "Posts" }) },
    { id: "photos", label: t("feed.photos", { defaultValue: "Photos" }) },
    { id: "videos", label: t("feed.videos", { defaultValue: "Videos" }) },
    { id: "friends", label: t("nav.friends", { defaultValue: "Friends" }) },
  ];

  // Add mutual tab for non-own profiles
  const isOwnProfile = user?.id === profile?.user_id;
  if (!isOwnProfile && user) {
    tabs.push({ id: "mutual", label: t("profile.mutualFriends", { defaultValue: "Mutual" }) });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-48 w-full" />
          <div className="px-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 sm:-mt-20">
              <Skeleton className="w-32 h-32 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t("profile.userNotFound", { defaultValue: "User Not Found" })}</h1>
          <p className="text-muted-foreground mb-6">
            {t("profile.userNotFoundDesc", { defaultValue: "The user @{{username}} doesn't exist or may have changed their username.", username })}
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("common.goHome", { defaultValue: "Go Home" })}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Show blocked screen if the profile owner has blocked the current user
  if (blockedByOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Ban className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {t("privacy.profileUnavailable", { defaultValue: "Profile Unavailable" })}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t("privacy.cannotViewProfile", { defaultValue: "You cannot view this profile." })}
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("common.goHome", { defaultValue: "Go Home" })}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleCoverSaved = (newCoverUrl: string) => {
    setProfile(prev => prev ? { ...prev, cover_url: newCoverUrl || null } : null);
    setShowCoverEditor(false);
  };

  const handleAvatarSaved = (newAvatarUrl: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: newAvatarUrl || null } : null);
    setShowAvatarEditor(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Profile Card Container */}
        <section className="mb-4 overflow-visible rounded-xl bg-card shadow-sm relative">
          {/* Cover Image */}
          <div className="relative h-48 sm:h-56 md:h-64 bg-gradient-to-br from-primary/30 to-primary/10 group rounded-t-xl">
            {profile?.cover_url ? (
              <img 
                src={profile.cover_url} 
                alt="Cover" 
                className="w-full h-full object-cover rounded-t-xl"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 rounded-t-xl" />
            )}
            
            {/* Back Button */}
            <Link to="/" className="absolute top-4 left-4">
              <Button variant="secondary" size="sm" className="shadow-lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("common.back", { defaultValue: "Back" })}
              </Button>
            </Link>

            {/* Action buttons on cover */}
            {isOwnProfile ? (
              // Edit Cover Button - Only show for own profile
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-4 right-4 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setShowCoverEditor(true)}
              >
                <Camera className="w-4 h-4 mr-2" />
                {t("profile.editCover", { defaultValue: "Edit Cover" })}
              </Button>
            ) : user && (
              // Favorite button for other profiles
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "absolute bottom-4 right-4 shadow-lg h-10 w-10 rounded-full bg-muted hover:bg-muted/80",
                  isFavorite && "text-yellow-500"
                )}
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                title={isFavorite ? t("favorites.remove", { defaultValue: "Remove from favorites" }) : t("favorites.add", { defaultValue: "Add to favorites" })}
              >
                <Star className={cn("w-5 h-5", isFavorite && "fill-current")} />
              </Button>
            )}
          </div>

        {/* Cover Editor Modal */}
        <CoverEditor
          open={showCoverEditor}
          onOpenChange={setShowCoverEditor}
          userId={user?.id || ""}
          currentCover={profile?.cover_url || undefined}
          onCoverSaved={handleCoverSaved}
        />

        {/* Avatar Editor Modal */}
        <AvatarEditor
          open={showAvatarEditor}
          onOpenChange={setShowAvatarEditor}
          userId={user?.id || ""}
          currentAvatar={profile?.avatar_url || undefined}
          onAvatarSaved={handleAvatarSaved}
        />

        {/* Profile Header */}
        <div className="relative bg-card border-t border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 pb-4">
            {/* Avatar - overlapping the cover */}
            <div className="relative -mt-16 ml-4 sm:ml-6 flex-shrink-0">
              <div className={`group/avatar relative ${isOwnProfile ? "cursor-pointer" : ""}`}>
                <Avatar className="h-28 w-28 sm:h-32 sm:w-32 ring-4 ring-card shadow-xl border-2 border-primary/20">
                  <AvatarImage src={profile?.avatar_url || ""} alt={`${profile?.display_name}'s avatar`} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-2xl">
                    {profile?.display_name?.charAt(0) || profile?.username?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full shadow-lg opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                    onClick={() => setShowAvatarEditor(true)}
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Name, Username, and Action Buttons */}
            <div className="flex-1 min-w-0 px-4 sm:px-0 pt-2 sm:pt-4 sm:pb-2">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                {/* Name and Username */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                      {profile?.display_name || profile?.username || "Unknown User"}
                    </h1>
                    {profile?.is_verified && (
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                    )}
                    {isMuted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground" title={t('privacy.mutedUser', 'You have muted this user')}>
                        <VolumeX className="h-3 w-3" />
                        {t('privacy.muted', 'Muted')}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">@{profile?.username}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  {isOwnProfile ? (
                    <Link to="/dashboard">
                      <Button variant="outline">{t("profile.editProfile", { defaultValue: "Edit Profile" })}</Button>
                    </Link>
                  ) : (
                    <>
                      {renderFriendButton()}
                      {/* Favorite button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={toggleFavorite}
                              disabled={favoriteLoading}
                              className={isFavorite ? "text-yellow-500 hover:text-yellow-600" : ""}
                              title={isFavorite ? t("favorites.remove", { defaultValue: "Remove from favorites" }) : t("favorites.add", { defaultValue: "Add to favorites" })}
                            >
                              <Star className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isFavorite ? t("favorites.remove", { defaultValue: "Remove from favorites" }) : t("favorites.add", { defaultValue: "Add to favorites" })}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {/* Message button - respect DM privacy settings */}
                      {profilePrivacySettings.allow_direct_messages || friendshipStatus === "accepted" ? (
                        <MessagesSheet 
                          initialUserId={profile?.user_id}
                          initialUser={{
                            display_name: profile?.display_name || null,
                            avatar_url: profile?.avatar_url || null,
                            username: profile?.username || null,
                          }}
                        >
                          <Button variant="outline" size="icon" title={t("profile.message", { defaultValue: "Message" })}>
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </MessagesSheet>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" disabled className="opacity-50">
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("privacy.dmDisabled", { defaultValue: "This user has disabled direct messages" })}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" title={t("profile.more", { defaultValue: "More options" })}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-popover">
                          <DropdownMenuItem 
                            onClick={muteUser} 
                            className="cursor-pointer"
                            disabled={blockMuteLoading}
                          >
                            {isMuted ? (
                              <>
                                <Volume2 className="h-4 w-4 mr-2" />
                                {t('privacy.unmute', 'Unmute user')}
                              </>
                            ) : (
                              <>
                                <VolumeX className="h-4 w-4 mr-2" />
                                {t('privacy.mute', 'Mute user')}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={blockUser} 
                            className="cursor-pointer text-destructive focus:text-destructive"
                            disabled={blockMuteLoading}
                          >
                            {isBlocked ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                {t('privacy.unblock', 'Unblock user')}
                              </>
                            ) : (
                              <>
                                <Ban className="h-4 w-4 mr-2" />
                                {t('privacy.block', 'Block user')}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="cursor-pointer text-muted-foreground">
                            {t('profile.reportUser', 'Report user')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bio, Location & Meta */}
          <div className="px-4 sm:px-6 pb-4 space-y-3">
            {profile?.bio && (
              <p className="text-foreground">{profile.bio}</p>
            )}
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {(profile?.location || profile?.country) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">
                    {profile?.location ? `${profile.location}` : ""}
                    {profile?.location && profile?.country ? ", " : ""}
                    {profile?.country ? (countryNames[profile.country] || profile.country) : ""}
                  </span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary/70" />
                <span className="font-medium">
                  {t("profile.joined", { defaultValue: "Joined" })} {new Date(profile?.created_at || "").toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </span>
              </span>
            </div>

            {/* Stats */}
            <div className="flex gap-6 pt-2">
              <button 
                className="hover:underline"
                onClick={handleOpenFriendsModal}
                disabled={friendsCount === 0}
              >
                <span className="font-bold">{friendsCount}</span>{" "}
                <span className="text-muted-foreground">{friendsCount === 1 ? t("friends.friend", { defaultValue: "Friend" }) : t("nav.friends", { defaultValue: "Friends" })}</span>
              </button>
              <button className="hover:underline">
                <span className="font-bold">{postsCount}</span>{" "}
                <span className="text-muted-foreground">{postsCount === 1 ? t("feed.post", { defaultValue: "Post" }) : t("feed.posts", { defaultValue: "Posts" })}</span>
              </button>
            </div>

            {/* Mutual Friends Section - Only show when viewing someone else's profile */}
            {!isOwnProfile && user && (
              <div className="pt-3">
                {loadingMutualFriends ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="w-8 h-8 rounded-full border-2 border-background" />
                      ))}
                    </div>
                    <span>{t("common.loading", { defaultValue: "Loading..." })}</span>
                  </div>
                ) : mutualFriends.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {mutualFriends.slice(0, 5).map((friend) => (
                        <Avatar 
                          key={friend.user_id} 
                          className="w-8 h-8 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110"
                          onClick={() => navigate(`/${friend.username}`)}
                        >
                          <AvatarImage src={friend.avatar_url || ""} />
                          <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                            {friend.display_name?.charAt(0) || friend.username?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {mutualFriends.length === 1 ? (
                        <>
                          <button 
                            className="font-medium text-foreground hover:underline"
                            onClick={() => navigate(`/${mutualFriends[0].username}`)}
                          >
                            {mutualFriends[0].display_name || mutualFriends[0].username}
                          </button>
                          {" "}{t("profile.isMutualFriend", { defaultValue: "is a mutual friend" })}
                        </>
                      ) : mutualFriends.length === 2 ? (
                        <>
                          <button 
                            className="font-medium text-foreground hover:underline"
                            onClick={() => navigate(`/${mutualFriends[0].username}`)}
                          >
                            {mutualFriends[0].display_name || mutualFriends[0].username}
                          </button>
                          {" "}{t("common.and", { defaultValue: "and" })}{" "}
                          <button 
                            className="font-medium text-foreground hover:underline"
                            onClick={() => navigate(`/${mutualFriends[1].username}`)}
                          >
                            {mutualFriends[1].display_name || mutualFriends[1].username}
                          </button>
                          {" "}{t("profile.areMutualFriends", { defaultValue: "are mutual friends" })}
                        </>
                      ) : (
                        <>
                          <button 
                            className="font-medium text-foreground hover:underline"
                            onClick={() => navigate(`/${mutualFriends[0].username}`)}
                          >
                            {mutualFriends[0].display_name || mutualFriends[0].username}
                          </button>
                          {", "}
                          <button 
                            className="font-medium text-foreground hover:underline"
                            onClick={() => navigate(`/${mutualFriends[1].username}`)}
                          >
                            {mutualFriends[1].display_name || mutualFriends[1].username}
                          </button>
                          {" "}{t("profile.andOthersMutual", { 
                            defaultValue: "and {{count}} other mutual friends",
                            count: mutualFriends.length - 2
                          })}
                        </>
                      )}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("profile.noMutualFriends", { defaultValue: "No mutual friends" })}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        </section>

        {/* Tab Navigation */}
        <div className="border-b bg-card sticky top-0 z-10">
          <nav className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                }`}
              >
                {tab.label}
                {tab.id === "mutual" && mutualFriends.length > 0 && (
                  <span className="ml-1.5 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem]">
                    {mutualFriends.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === "posts" && (
            <div className="space-y-4">
              {loadingPosts ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-card rounded-lg p-4 border">
                      <div className="flex items-center gap-3 mb-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ))}
                </div>
              ) : userPosts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8" />
                  </div>
                  <p>{t("profile.noPostsYet", { defaultValue: "No posts yet" })}</p>
                </div>
              ) : (
                userPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
            </div>
          )}

          {activeTab === "photos" && profile?.user_id && (
            <ProfileTabContent 
              activeTab="photos" 
              userId={profile.user_id} 
            />
          )}

          {activeTab === "videos" && profile?.user_id && (
            <ProfileTabContent 
              activeTab="videos" 
              userId={profile.user_id} 
            />
          )}

          {activeTab === "friends" && profile?.user_id && (
            <ProfileTabContent 
              activeTab="friends" 
              userId={profile.user_id} 
            />
          )}

          {activeTab === "mutual" && !isOwnProfile && user && (
            <div className="space-y-4">
              {loadingMutualFriends ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : mutualFriends.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8" />
                  </div>
                  <p>{t("profile.noMutualFriends", { defaultValue: "No mutual friends" })}</p>
                  <p className="text-sm mt-2">
                    {t("profile.noMutualFriendsDesc", { defaultValue: "You don't have any friends in common with this person yet." })}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t("profile.mutualFriendsCount", { 
                      defaultValue: "{{count}} mutual friends with {{name}}",
                      count: mutualFriends.length,
                      name: profile?.display_name || profile?.username || "this person"
                    })}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mutualFriends.map((friend) => (
                      <button
                        key={friend.user_id}
                        onClick={() => navigate(`/${friend.username}`)}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={friend.avatar_url || ""} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                            {friend.display_name?.charAt(0) || friend.username?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-medium truncate">
                              {friend.display_name || friend.username || "Unknown"}
                            </span>
                            {friend.is_verified && (
                              <CheckCircle2 className="w-4 h-4 text-primary fill-primary/20 flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground truncate block">
                            @{friend.username}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Friends List Modal */}
        <Dialog open={showFriendsModal} onOpenChange={setShowFriendsModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t("nav.friends", { defaultValue: "Friends" })} ({friendsCount})
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {loadingFriends ? (
                <div className="space-y-3 p-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : friendsList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t("friends.noFriends", { defaultValue: "No friends to show" })}</p>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {friendsList.map((friend) => (
                    <button
                      key={friend.user_id}
                      onClick={() => handleFriendClick(friend.username)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors w-full text-left"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={friend.avatar_url || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                          {friend.display_name?.charAt(0) || friend.username?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium truncate">
                            {friend.display_name || friend.username || "Unknown"}
                          </span>
                          {friend.is_verified && (
                            <CheckCircle2 className="w-4 h-4 text-primary fill-primary/20 flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground truncate block">
                          @{friend.username}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UserProfile;
