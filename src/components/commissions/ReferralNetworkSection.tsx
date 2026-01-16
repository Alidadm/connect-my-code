import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  Search, 
  Heart,
  UserX
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ReferralUser {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  isFriend: boolean;
}

interface ReferralNetworkSectionProps {
  userId: string;
}

const ITEMS_PER_PAGE = 10;

const ReferralNetworkSection = ({ userId }: ReferralNetworkSectionProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<ReferralUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [addingFriend, setAddingFriend] = useState<string | null>(null);

  useEffect(() => {
    fetchReferrals();
  }, [userId]);

  const fetchReferrals = async () => {
    try {
      setLoading(true);

      // Fetch all profiles that have this user as their referrer
      const { data: referredProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, first_name, last_name, created_at")
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      if (!referredProfiles || referredProfiles.length === 0) {
        setReferrals([]);
        setLoading(false);
        return;
      }

      // Get friend status for each referral
      const referralUserIds = referredProfiles.map(p => p.user_id);
      
      // Check friendships where current user is either requester or addressee
      const { data: friendships, error: friendshipsError } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq("status", "accepted");

      if (friendshipsError) throw friendshipsError;

      // Create a set of friend user IDs
      const friendIds = new Set<string>();
      friendships?.forEach(f => {
        if (f.requester_id === userId) {
          friendIds.add(f.addressee_id);
        } else {
          friendIds.add(f.requester_id);
        }
      });

      // Map profiles with friend status
      const referralsWithFriendStatus: ReferralUser[] = referredProfiles.map(profile => ({
        ...profile,
        isFriend: friendIds.has(profile.user_id),
      }));

      setReferrals(referralsWithFriendStatus);
    } catch (error: any) {
      console.error("Error fetching referrals:", error);
      toast.error("Failed to load referral network");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (targetUserId: string) => {
    try {
      setAddingFriend(targetUserId);

      // Check if there's already a pending request
      const { data: existingRequest, error: checkError } = await supabase
        .from("friendships")
        .select("id, status")
        .or(`and(requester_id.eq.${userId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${userId})`)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRequest) {
        if (existingRequest.status === "pending") {
          toast.info("Friend request already pending");
        } else if (existingRequest.status === "accepted") {
          toast.info("You're already friends!");
        }
        return;
      }

      // Create friend request
      const { error: insertError } = await supabase
        .from("friendships")
        .insert({
          requester_id: userId,
          addressee_id: targetUserId,
          status: "pending",
        });

      if (insertError) throw insertError;

      toast.success("Friend request sent!");
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request");
    } finally {
      setAddingFriend(null);
    }
  };

  // Filter referrals based on search and tab
  const filteredReferrals = referrals.filter(referral => {
    const matchesSearch = searchQuery === "" || 
      referral.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.last_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "friends") {
      return matchesSearch && referral.isFriend;
    } else if (activeTab === "non-friends") {
      return matchesSearch && !referral.isFriend;
    }
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredReferrals.length / ITEMS_PER_PAGE);
  const paginatedReferrals = filteredReferrals.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Stats
  const totalReferrals = referrals.length;
  const friendCount = referrals.filter(r => r.isFriend).length;
  const nonFriendCount = referrals.filter(r => !r.isFriend).length;

  const getDisplayName = (referral: ReferralUser) => {
    if (referral.display_name) return referral.display_name;
    if (referral.first_name || referral.last_name) {
      return `${referral.first_name || ""} ${referral.last_name || ""}`.trim();
    }
    return referral.username || "Unknown User";
  };

  const getInitials = (referral: ReferralUser) => {
    const name = getDisplayName(referral);
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card id="referral-network" className="mb-8 scroll-mt-20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <CardTitle className="text-lg">{t("dashboard.referralNetwork")}</CardTitle>
            <CardDescription>
              {t("referrals.manageDescription", "Manage your referrals and connect with them as friends")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{totalReferrals}</p>
            <p className="text-xs text-muted-foreground">{t("referrals.totalReferrals", "Total Referrals")}</p>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{friendCount}</p>
            <p className="text-xs text-muted-foreground">{t("referrals.friends")}</p>
          </div>
          <div className="text-center p-3 bg-orange-500/10 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">{nonFriendCount}</p>
            <p className="text-xs text-muted-foreground">{t("referrals.nonFriends")}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("referrals.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("referrals.all")} ({totalReferrals})
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              {t("referrals.friends")} ({friendCount})
            </TabsTrigger>
            <TabsTrigger value="non-friends" className="flex items-center gap-2">
              <UserX className="h-4 w-4" />
              {t("referrals.nonFriends")} ({nonFriendCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : filteredReferrals.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">
                  {referrals.length === 0
                    ? t("referrals.noReferralsYet", "No referrals yet. Share your link to grow your network!")
                    : activeTab === "friends"
                    ? t("referrals.noFriendsYet", "No friends in your referral network yet")
                    : activeTab === "non-friends"
                    ? t("referrals.allAreFriends", "All your referrals are already friends!")
                    : t("referrals.noReferrals")}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {paginatedReferrals.map((referral) => (
                    <div
                      key={referral.user_id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => referral.username && navigate(`/${referral.username}`)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={referral.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(referral)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{getDisplayName(referral)}</p>
                            {referral.isFriend && (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                                <Heart className="h-3 w-3 mr-1 fill-current" />
                                {t("referrals.friend", "Friend")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {referral.username ? `@${referral.username}` : "No username"} • Joined {formatDate(referral.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {referral.isFriend ? (
                          <Button variant="outline" size="sm" disabled className="text-green-600">
                            <UserCheck className="h-4 w-4 mr-1" />
                            {t("referrals.friends")}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddFriend(referral.user_id)}
                            disabled={addingFriend === referral.user_id}
                          >
                            {addingFriend === referral.user_id ? (
                              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-1" />
                            ) : (
                              <UserPlus className="h-4 w-4 mr-1" />
                            )}
                            {t("referrals.sendFriendRequest")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setCurrentPage(pageNum)}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ReferralNetworkSection;
