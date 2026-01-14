import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Image, 
  Send, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowLeft,
  Settings,
  UserPlus,
  Crown,
  Shield,
  MoreVertical,
  Globe
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PostCard } from "@/components/feed/PostCard";
import { formatDistanceToNow } from "date-fns";

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  cover_url: string | null;
  member_count: number;
  description: string | null;
  privacy: string;
  category: string | null;
  creator_id: string;
  created_at: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

interface GroupPost {
  id: string;
  content: string | null;
  media_urls: string[] | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  user_id: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
    is_verified: boolean | null;
  };
}

const GroupDetail = () => {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [postContent, setPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchGroupData();
    }
  }, [groupId, user]);

  const fetchGroupData = async () => {
    if (!groupId) return;

    try {
      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      // Check if user is a member and get their role
      if (user) {
        const { data: memberData } = await supabase
          .from("group_members")
          .select("role")
          .eq("group_id", groupId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (memberData) {
          setIsMember(true);
          setUserRole(memberData.role);
        }
      }

      // Fetch members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select("id, user_id, role, joined_at")
        .eq("group_id", groupId)
        .order("role", { ascending: true })
        .order("joined_at", { ascending: true });

      if (!membersError && membersData) {
        // Fetch profiles for members
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, username")
          .in("user_id", userIds);

        const membersWithProfiles = membersData.map(member => ({
          ...member,
          profile: profilesData?.find(p => p.user_id === member.user_id)
        }));

        setMembers(membersWithProfiles);
      }

      // Fetch group posts (for now, fetch public posts from group members)
      // In a full implementation, you'd have a group_posts table
      await fetchGroupPosts();

    } catch (error) {
      console.error("Error fetching group:", error);
      toast.error("Failed to load group");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroupPosts = async () => {
    if (!groupId) return;

    // For now, we'll simulate group posts by fetching recent posts
    // In production, you'd have a dedicated group_posts table
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        // Fetch profiles for posts
        const userIds = [...new Set(data.map(p => p.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, username, is_verified")
          .in("user_id", userIds);

        const postsWithProfiles = data.map(post => ({
          ...post,
          profiles: profilesData?.find(p => p.user_id === post.user_id)
        }));

        setPosts(postsWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const handlePost = async () => {
    if (!postContent.trim() || !user || !group) return;

    setIsPosting(true);
    try {
      const { error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: postContent,
          visibility: "public"
        });

      if (error) throw error;

      setPostContent("");
      toast.success("Post created!");
      fetchGroupPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!user || !group) return;

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

        setIsMember(true);
        setUserRole("member");
        toast.success("You've joined the group!");
        fetchGroupData();
      } else {
        // Request to join for private groups
        const { error } = await supabase
          .from("group_join_requests")
          .insert({
            group_id: group.id,
            user_id: user.id,
            status: "pending"
          });

        if (error) throw error;
        toast.success("Join request sent!");
      }
    } catch (error: any) {
      console.error("Error joining group:", error);
      if (error.code === "23505") {
        toast.error("You've already requested to join");
      } else {
        toast.error("Failed to join group");
      }
    }
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "public":
        return <Globe className="h-4 w-4" />;
      case "private_visible":
        return <Eye className="h-4 w-4" />;
      case "private_hidden":
        return <EyeOff className="h-4 w-4" />;
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  const getPrivacyLabel = (privacy: string) => {
    switch (privacy) {
      case "public":
        return "Public Group";
      case "private_visible":
        return "Private Group";
      case "private_hidden":
        return "Hidden Group";
      default:
        return privacy;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "moderator":
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Admin</Badge>;
      case "moderator":
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">Mod</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!group) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Group Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The group you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/groups")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isAdmin = userRole === "admin";
  const isMod = userRole === "moderator";
  const canManage = isAdmin || isMod;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/groups")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Groups
        </Button>

        {/* Group Header with Cover */}
        <Card className="overflow-hidden">
          {/* Cover Image */}
          <div 
            className="h-48 md:h-64 bg-gradient-to-br from-primary/30 to-primary/10 relative"
            style={group.cover_url ? { 
              backgroundImage: `url(${group.cover_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {}}
          >
            {canManage && (
              <Button 
                variant="secondary" 
                size="sm" 
                className="absolute top-4 right-4 gap-2"
                onClick={() => navigate(`/groups/${groupId}/settings`)}
              >
                <Settings className="h-4 w-4" />
                Manage Group
              </Button>
            )}
          </div>

          {/* Group Info */}
          <CardContent className="pt-0 -mt-16 relative">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
              {/* Avatar */}
              <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                <AvatarImage src={group.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                  {group.name[0]}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">{group.name}</h1>
                  <Badge variant="secondary" className="gap-1">
                    {getPrivacyIcon(group.privacy)}
                    {getPrivacyLabel(group.privacy)}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  {group.member_count?.toLocaleString() || 0} members • {group.category || "Community"}
                </p>
                {group.description && (
                  <p className="text-foreground mt-2">{group.description}</p>
                )}
              </div>

              {/* Join/Manage Button */}
              <div className="flex gap-2 w-full md:w-auto">
                {!isMember && user && (
                  <Button className="flex-1 md:flex-none gap-2" onClick={handleJoinGroup}>
                    <UserPlus className="h-4 w-4" />
                    {group.privacy === "public" ? "Join Group" : "Request to Join"}
                  </Button>
                )}
                {isMember && (
                  <Badge variant="outline" className="h-9 px-4 text-sm">
                    {userRole === "admin" ? "👑 Admin" : userRole === "moderator" ? "🛡️ Moderator" : "✓ Member"}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Feed, Members */}
        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="w-full justify-start bg-card border">
            <TabsTrigger value="feed" className="gap-2">
              <Image className="h-4 w-4" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </TabsTrigger>
          </TabsList>

          {/* Feed Tab */}
          <TabsContent value="feed" className="mt-4 space-y-4">
            {/* Post Creator (only for members) */}
            {isMember && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {profile?.display_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <Textarea
                        placeholder={`Share something with ${group.name}...`}
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Image className="h-4 w-4" />
                          Add Media
                        </Button>
                        <Button 
                          onClick={handlePost} 
                          disabled={!postContent.trim() || isPosting} 
                          className="gap-2"
                        >
                          {isPosting && <Loader2 className="h-4 w-4 animate-spin" />}
                          <Send className="h-4 w-4" />
                          Post
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Posts */}
            {posts.length === 0 ? (
              <Card className="py-12 text-center">
                <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Posts Yet</h3>
                <p className="text-muted-foreground">
                  Be the first to share something with this group!
                </p>
              </Card>
            ) : (
              posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post}
                  onLikeChange={fetchGroupPosts}
                />
              ))
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Group Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {members.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No members yet</p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {member.profile?.display_name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {member.profile?.display_name || "Unknown User"}
                            </span>
                            {getRoleIcon(member.role)}
                            {getRoleBadge(member.role)}
                          </div>
                          {member.profile?.username && (
                            <p className="text-sm text-muted-foreground">
                              @{member.profile.username}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      {canManage && member.user_id !== user?.id && member.role !== "admin" && (
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default GroupDetail;
