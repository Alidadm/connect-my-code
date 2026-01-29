import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/feed/PostCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const PostView = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      if (!postId) throw new Error("Post ID is required");

      // First get the post
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (postError) throw postError;

      // Then get the profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, is_verified")
        .eq("user_id", postData.user_id)
        .single();

      return {
        ...postData,
        profiles: profileData,
      };
    },
    enabled: !!postId,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (error || !post) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto py-8 px-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back", "Back")}
          </Button>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">
              {t("post.notFound", "Post not found")}
            </h2>
            <p className="text-muted-foreground">
              {t("post.notFoundDescription", "This post may have been deleted or is not available.")}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-4 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common.back", "Back")}
        </Button>
        
        <PostCard
          post={{
            id: post.id,
            content: post.content || "",
            media_urls: post.media_urls || [],
            created_at: post.created_at,
            likes_count: post.likes_count || 0,
            comments_count: post.comments_count || 0,
            shares_count: post.shares_count || 0,
            user_id: post.user_id,
            profiles: post.profiles,
          }}
        />
      </div>
    </MainLayout>
  );
};

export default PostView;
