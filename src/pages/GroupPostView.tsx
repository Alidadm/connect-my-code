import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { GroupPostCard } from "@/components/groups/GroupPostCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, Lock, Globe } from "lucide-react";

const GroupPostView = () => {
  const { groupId, postId } = useParams<{ groupId: string; postId: string }>();
  const { user } = useAuth();

  // Fetch group details
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  // Fetch post with author profile
  const { data: post, isLoading: postLoading, refetch } = useQuery({
    queryKey: ["group-post", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_posts")
        .select("*")
        .eq("id", postId)
        .eq("group_id", groupId)
        .single();

      if (error) throw error;

      // Fetch author profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, username, is_verified")
        .eq("user_id", data.user_id)
        .single();

      return { ...data, profiles: profile };
    },
    enabled: !!postId && !!groupId,
  });

  // Check if user is a member
  const { data: membership } = useQuery({
    queryKey: ["group-membership", groupId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!groupId && !!user,
  });

  const isLoading = groupLoading || postLoading;
  const isMember = !!membership;
  const canModerate = membership?.role === "admin" || membership?.role === "moderator";

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!group || !post) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="text-xl font-semibold mb-2">Post not found</h2>
              <p className="text-muted-foreground mb-4">
                This post may have been deleted or you don't have permission to view it.
              </p>
              <Button asChild>
                <Link to="/groups">Back to Groups</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Check if user can view (public groups or member of private)
  const canView = group.privacy === "public" || group.privacy === "private_visible" || isMember;

  if (!canView) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Private Group</h2>
              <p className="text-muted-foreground mb-4">
                You need to be a member of this group to view this post.
              </p>
              <Button asChild>
                <Link to={`/groups/${groupId}`}>View Group</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Back button and group info */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/groups/${groupId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Link to={`/groups/${groupId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Avatar className="h-10 w-10">
              <AvatarImage src={group.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {group.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-foreground">{group.name}</h2>
                {group.privacy === "public" ? (
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{group.member_count || 0} members</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Post */}
        <GroupPostCard
          post={post}
          onPostChange={refetch}
          canModerate={canModerate}
        />
      </div>
    </MainLayout>
  );
};

export default GroupPostView;
