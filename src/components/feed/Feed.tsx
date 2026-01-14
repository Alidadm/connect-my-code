import { useState, useEffect } from "react";
import { StoriesRow } from "./StoriesRow";
import { PostCreator } from "./PostCreator";
import { DemoPostCreator } from "./DemoPostCreator";
import { PostCard } from "./PostCard";
import { DemoPostCard } from "./DemoPostCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

interface Post {
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

// Demo posts matching the screenshot
const demoPosts = [
  {
    id: "demo-1",
    author: {
      name: "Cameron Williamson",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    time: "23 Aug at 4:21 PM",
    images: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1633186223077-d13c97f9f0b5?w=400&h=400&fit=crop",
    ],
    likes: 30,
    comments: 12,
    shares: 5,
  },
  {
    id: "demo-2",
    author: {
      name: "Terry Lipshutz",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    },
    time: "22 Aug at 7:15 PM",
    images: [
      "https://images.unsplash.com/photo-1614850715649-1d0106293bd1?w=800&h=400&fit=crop",
    ],
    likes: 45,
    comments: 8,
    shares: 3,
  },
  {
    id: "demo-3",
    author: {
      name: "Sarah Chen",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    time: "21 Aug at 2:30 PM",
    content: "Just finished my latest design project! What do you think? 🎨✨",
    images: [
      "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=400&fit=crop",
    ],
    likes: 128,
    comments: 24,
    shares: 12,
  },
];

export const Feed = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"following" | "trending" | "recent">("following");

  const fetchPosts = async () => {
    try {
      let postsData: any[] = [];

      if (user) {
        // Logged in: fetch public posts + user's own posts (any visibility)
        const { data: publicPosts, error: publicError } = await supabase
          .from("posts")
          .select("*")
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(20);

        if (publicError) throw publicError;

        const { data: myPosts, error: myError } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", user.id)
          .neq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(20);

        if (myError) throw myError;

        // Merge and sort by date
        const allPosts = [...(publicPosts || []), ...(myPosts || [])];
        postsData = allPosts.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 20);
      } else {
        // Not logged in: only public posts
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        postsData = data || [];
      }

      // Fetch profiles for each post
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, username, is_verified")
          .in("user_id", userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
        
        const postsWithProfiles = postsData.map(post => ({
          ...post,
          profiles: profilesMap.get(post.user_id) || undefined
        }));

        setPosts(postsWithProfiles);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("posts-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getFilterLabel = () => {
    switch (filter) {
      case "following": return t("feed.following");
      case "trending": return t("feed.trending");
      case "recent": return t("feed.recent");
      default: return filter;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <StoriesRow />
      {user ? <PostCreator onPostCreated={fetchPosts} /> : <DemoPostCreator />}

      {/* Filter tabs */}
      <div className="flex items-center justify-end mb-4 gap-2">
        <span className="text-sm text-muted-foreground">{t("feed.sortBy")}:</span>
        <Button variant="ghost" size="sm" className="gap-1 text-foreground font-medium">
          {getFilterLabel()}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Show real posts if any */}
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onLikeChange={fetchPosts} />
          ))}
          
          {/* Always show demo posts */}
          {demoPosts.map((post) => (
            <DemoPostCard key={post.id} post={post} />
          ))}
        </>
      )}
    </div>
  );
};
