import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Plus, 
  Image, 
  Send, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  ExternalLink,
  Search,
  Compass,
  UserPlus,
  Globe
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  cover_url: string | null;
  member_count: number;
  description: string | null;
  privacy: string;
  category: string | null;
}

const Groups = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [postContent, setPostContent] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [userJoinedIds, setUserJoinedIds] = useState<Set<string>>(new Set());
  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set());

  // Handle create=true query parameter
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setShowCreateModal(true);
      // Remove the query parameter to clean up the URL
      searchParams.delete("create");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchUserGroups();
  }, [user]);

  useEffect(() => {
    fetchDiscoverGroups();
  }, [user, searchQuery]);

  const fetchUserGroups = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Get groups where user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      const groupIds = memberGroups?.map(g => g.group_id) || [];
      setUserJoinedIds(new Set(groupIds));

      if (groupIds.length === 0) {
        setGroups([]);
        setIsLoading(false);
        return;
      }

      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("id, name, avatar_url, cover_url, member_count, description, privacy, category")
        .in("id", groupIds)
        .order("name");

      if (groupError) throw groupError;

      setGroups(groupData || []);
      if (groupData && groupData.length > 0 && !selectedGroup) {
        setSelectedGroup(groupData[0]);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error("Failed to load groups");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDiscoverGroups = async () => {
    setIsDiscoverLoading(true);
    try {
      // Get user's joined group IDs
      let joinedIds: string[] = [];
      if (user) {
        const { data: memberGroups } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", user.id);
        joinedIds = memberGroups?.map(g => g.group_id) || [];

        // Get pending join requests
        const { data: pendingRequests } = await supabase
          .from("group_join_requests")
          .select("group_id")
          .eq("user_id", user.id)
          .eq("status", "pending");
        setPendingRequestIds(new Set(pendingRequests?.map(r => r.group_id) || []));
      }

      // Fetch public and private_visible groups (exclude hidden groups)
      let query = supabase
        .from("groups")
        .select("id, name, avatar_url, cover_url, member_count, description, privacy, category")
        .in("privacy", ["public", "private_visible"])
        .order("member_count", { ascending: false })
        .limit(20);

      // Add search filter if query exists
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
      }

      const { data: publicGroups, error } = await query;

      if (error) throw error;

      // Filter out groups user has already joined
      const filteredGroups = (publicGroups || []).filter(
        g => !joinedIds.includes(g.id)
      );

      setDiscoverGroups(filteredGroups);
    } catch (error) {
      console.error("Error fetching discover groups:", error);
    } finally {
      setIsDiscoverLoading(false);
    }
  };

  const handleJoinGroup = async (group: Group) => {
    if (!user) {
      toast.error("Please log in to join groups");
      return;
    }

    setJoiningGroupId(group.id);
    try {
      if (group.privacy === "public") {
        // Direct join for public groups
        const { error } = await supabase
          .from("group_members")
          .insert({
            group_id: group.id,
            user_id: user.id,
            role: "member"
          });

        if (error) throw error;

        // Update member count
        await supabase
          .from("groups")
          .update({ member_count: (group.member_count || 0) + 1 })
          .eq("id", group.id);

        toast.success(`You've joined ${group.name}!`);
        
        // Refresh both lists
        fetchUserGroups();
        fetchDiscoverGroups();
      } else {
        // Request to join for private groups
        const { error } = await supabase
          .from("group_join_requests")
          .insert({
            group_id: group.id,
            user_id: user.id,
            status: "pending"
          });

        if (error) {
          if (error.code === "23505") {
            toast.error("You've already requested to join this group");
            return;
          }
          throw error;
        }

        setPendingRequestIds(prev => new Set([...prev, group.id]));
        toast.success("Join request sent! Waiting for admin approval.");
      }
    } catch (error: any) {
      console.error("Error joining group:", error);
      toast.error("Failed to join group");
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handlePost = () => {
    if (!postContent.trim() || !selectedGroup) return;
    console.log("Posting to group:", selectedGroup.name, postContent);
    setPostContent("");
    toast.success("Post created!");
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "public":
        return <Globe className="h-3 w-3" />;
      case "private_visible":
        return <Eye className="h-3 w-3" />;
      case "private_hidden":
        return <EyeOff className="h-3 w-3" />;
      default:
        return <Lock className="h-3 w-3" />;
    }
  };

  const getPrivacyLabel = (privacy: string) => {
    switch (privacy) {
      case "public":
        return "Public";
      case "private_visible":
        return "Private";
      case "private_hidden":
        return "Hidden";
      default:
        return privacy;
    }
  };

  const renderGroupCard = (group: Group, isDiscover: boolean = false) => (
    <Card
      key={group.id}
      className={`cursor-pointer transition-all hover:border-primary/50 ${
        !isDiscover && selectedGroup?.id === group.id ? "border-primary ring-1 ring-primary" : ""
      }`}
      onClick={() => !isDiscover && setSelectedGroup(group)}
    >
      {/* Cover image for discover */}
      {isDiscover && group.cover_url && (
        <div 
          className="h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg"
          style={{ 
            backgroundImage: `url(${group.cover_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}
      <CardContent className={`p-4 ${isDiscover && group.cover_url ? '-mt-8' : ''}`}>
        <div className="flex items-start gap-3">
          <Avatar className={`${isDiscover ? 'h-16 w-16 border-4 border-background' : 'h-14 w-14'}`}>
            <AvatarImage src={group.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {group.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{group.name}</h3>
              {getPrivacyIcon(group.privacy)}
            </div>
            <p className="text-sm text-muted-foreground">
              {group.member_count?.toLocaleString() || 0} members
            </p>
            {group.category && (
              <Badge variant="outline" className="mt-1 text-xs">
                {group.category}
              </Badge>
            )}
            {group.description && (
              <p className="text-xs text-muted-foreground truncate mt-1">
                {group.description}
              </p>
            )}
          </div>
          {isDiscover ? (
            <div className="flex flex-col gap-2">
              {pendingRequestIds.has(group.id) ? (
                <Badge variant="secondary" className="text-xs">Pending</Badge>
              ) : (
                <Button 
                  size="sm"
                  className="gap-1"
                  disabled={joiningGroupId === group.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoinGroup(group);
                  }}
                >
                  {joiningGroupId === group.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <UserPlus className="h-3 w-3" />
                  )}
                  {group.privacy === "public" ? "Join" : "Request"}
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/groups/${group.id}`);
                }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/groups/${group.id}`);
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              {t("nav.groups", { defaultValue: "Groups" })}
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect with communities that share your interests
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my-groups" className="w-full">
          <TabsList className="w-full justify-start bg-card border">
            <TabsTrigger value="my-groups" className="gap-2">
              <Users className="h-4 w-4" />
              My Groups ({groups.length})
            </TabsTrigger>
            <TabsTrigger value="discover" className="gap-2">
              <Compass className="h-4 w-4" />
              Discover
            </TabsTrigger>
          </TabsList>

          {/* My Groups Tab */}
          <TabsContent value="my-groups" className="mt-4 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : groups.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Groups Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first group or discover communities to join
                </p>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Group
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {/* Selected Group Post Box */}
                {selectedGroup && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={selectedGroup.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {selectedGroup.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{selectedGroup.name}</CardTitle>
                            <Badge variant="secondary" className="gap-1 text-xs">
                              {getPrivacyIcon(selectedGroup.privacy)}
                              {getPrivacyLabel(selectedGroup.privacy)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {selectedGroup.member_count?.toLocaleString() || 0} members • {selectedGroup.category || "Community"}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        placeholder={`Share something with ${selectedGroup.name}...`}
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        className="min-h-[100px] resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Image className="h-4 w-4" />
                          Add Media
                        </Button>
                        <Button onClick={handlePost} disabled={!postContent.trim()} className="gap-2">
                          <Send className="h-4 w-4" />
                          Post
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Your Groups List */}
                <div>
                  <h2 className="text-lg font-semibold mb-4">Your Groups</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {groups.map((group) => renderGroupCard(group, false))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Discover Tab */}
          <TabsContent value="discover" className="mt-4 space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups by name, description, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isDiscoverLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : discoverGroups.length === 0 ? (
              <Card className="p-8 text-center">
                <Compass className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? "No Groups Found" : "No Groups to Discover"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? "Try a different search term" 
                    : "Create a new group to get started!"
                  }
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Group
                  </Button>
                )}
              </Card>
            ) : (
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  {searchQuery ? `Search Results (${discoverGroups.length})` : "Suggested Groups"}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {discoverGroups.map((group) => renderGroupCard(group, true))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateGroupModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
        onGroupCreated={(groupId) => {
          fetchUserGroups();
          fetchDiscoverGroups();
          // Navigate to the newly created group
          navigate(`/groups/${groupId}`);
        }}
      />
    </MainLayout>
  );
};

export default Groups;
