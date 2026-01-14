import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/feed/PostCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bookmark, Loader2, ArrowLeft } from "lucide-react";

interface BookmarkedPost {
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

const Saved = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BookmarkedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarkedPosts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get all bookmark records for the user
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from("bookmarks")
        .select("post_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bookmarksError) throw bookmarksError;

      if (!bookmarks || bookmarks.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postIds = bookmarks.map(b => b.post_id);

      // Fetch the actual posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .in("id", postIds);

      if (postsError) throw postsError;

      // Fetch profiles for post authors
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      
      let profilesMap = new Map();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, username, is_verified")
          .in("user_id", userIds);
        
        profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      }

      // Combine posts with profiles and maintain bookmark order
      const postsWithProfiles = postIds
        .map(postId => {
          const post = postsData?.find(p => p.id === postId);
          if (!post) return null;
          return {
            ...post,
            profiles: profilesMap.get(post.user_id) || undefined
          };
        })
        .filter(Boolean) as BookmarkedPost[];

      setPosts(postsWithProfiles);
    } catch (error) {
      console.error("Error fetching bookmarked posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarkedPosts();
  }, [user]);

  if (!user) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('saved.loginRequired', 'Login Required')}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t('saved.loginToView', 'Please log in to view your saved posts.')}
          </p>
          <Button onClick={() => navigate("/login")}>
            {t('common.login', 'Log In')}
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bookmark className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {t('saved.title', 'Saved Posts')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {posts.length} {posts.length === 1 
                  ? t('saved.postSingular', 'post saved') 
                  : t('saved.postPlural', 'posts saved')}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t('saved.noSavedPosts', 'No saved posts yet')}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {t('saved.noSavedPostsDesc', 'When you save posts, they\'ll appear here for easy access later.')}
            </p>
            <Button onClick={() => navigate("/")}>
              {t('saved.browseFeed', 'Browse Feed')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                onLikeChange={fetchBookmarkedPosts} 
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Saved;
