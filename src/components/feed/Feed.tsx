import { useState, useEffect, useRef, useCallback } from "react";
import { MemberCoverHeader } from "./MemberCoverHeader";
import { PostCreator } from "./PostCreator";
import { DemoPostCreator } from "./DemoPostCreator";
import { PostCard } from "./PostCard";
import { DemoPostCard } from "./DemoPostCard";
import { PullToRefreshIndicator } from "./PullToRefreshIndicator";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronDown, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

type FilterType = "following" | "trending" | "recent";
const POSTS_PER_PAGE = 10;

export const Feed = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterType>("recent");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchPostsWithProfiles = async (postsData: any[]) => {
    const userIds = [...new Set(postsData.map(p => p.user_id))];
    
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, is_verified")
        .in("user_id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      
      return postsData.map(post => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || undefined
      }));
    }
    return postsData;
  };

  const fetchPosts = async (offset: number = 0, append: boolean = false) => {
    try {
      if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      let postsData: any[] = [];

      if (user && filter === "following") {
        // Get friends list first
        const { data: friendships } = await supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq("status", "accepted");

        const friendIds = friendships?.map(f => 
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        ) || [];

        if (friendIds.length > 0) {
          const { data, error } = await supabase
            .from("posts")
            .select("*")
            .in("user_id", friendIds)
            .eq("visibility", "public")
            .order("created_at", { ascending: false })
            .range(offset, offset + POSTS_PER_PAGE - 1);

          if (error) throw error;
          postsData = data || [];
        }
      } else if (filter === "trending") {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("visibility", "public")
          .order("likes_count", { ascending: false })
          .range(offset, offset + POSTS_PER_PAGE - 1);

        if (error) throw error;
        
        // Sort by total engagement score
        postsData = (data || []).sort((a, b) => {
          const scoreA = (a.likes_count || 0) + (a.comments_count || 0) + (a.shares_count || 0);
          const scoreB = (b.likes_count || 0) + (b.comments_count || 0) + (b.shares_count || 0);
          return scoreB - scoreA;
        });
      } else {
        // Recent: default sorting by created_at
        if (user) {
          const { data: publicPosts, error: publicError } = await supabase
            .from("posts")
            .select("*")
            .eq("visibility", "public")
            .order("created_at", { ascending: false })
            .range(offset, offset + POSTS_PER_PAGE - 1);

          if (publicError) throw publicError;

          const { data: myPosts, error: myError } = await supabase
            .from("posts")
            .select("*")
            .eq("user_id", user.id)
            .neq("visibility", "public")
            .order("created_at", { ascending: false })
            .range(offset, offset + POSTS_PER_PAGE - 1);

          if (myError) throw myError;

          const allPosts = [...(publicPosts || []), ...(myPosts || [])];
          postsData = allPosts.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ).slice(0, POSTS_PER_PAGE);
        } else {
          const { data, error } = await supabase
            .from("posts")
            .select("*")
            .eq("visibility", "public")
            .order("created_at", { ascending: false })
            .range(offset, offset + POSTS_PER_PAGE - 1);

          if (error) throw error;
          postsData = data || [];
        }
      }

      // Check if we have more posts to load
      setHasMore(postsData.length === POSTS_PER_PAGE);

      // Fetch profiles and update state
      const postsWithProfiles = await fetchPostsWithProfiles(postsData);
      
      if (append) {
        setPosts(prev => {
          // Deduplicate posts by ID
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = postsWithProfiles.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
      } else {
        setPosts(postsWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPosts(posts.length, true);
    }
  }, [loadingMore, hasMore, posts.length, filter, user?.id]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, hasMore, loadingMore, loading]);

  useEffect(() => {
    // Reset and fetch when filter or user changes
    setPosts([]);
    setHasMore(true);
    fetchPosts(0, false);

    // Subscribe to realtime updates (only for new posts)
    const channel = supabase
      .channel("posts-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const newPost = payload.new as any;
          if (newPost.visibility === "public" || newPost.user_id === user?.id) {
            const postsWithProfiles = await fetchPostsWithProfiles([newPost]);
            setPosts(prev => [postsWithProfiles[0], ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter, user?.id]);

  const getFilterLabel = () => {
    switch (filter) {
      case "following": return t("feed.following");
      case "trending": return t("feed.trending");
      case "recent": return t("feed.recent");
      default: return filter;
    }
  };

  const handleFilterChange = (newFilter: FilterType) => {
    if (newFilter !== filter) {
      setFilter(newFilter);
    }
  };

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "following", label: t("feed.following") },
    { value: "trending", label: t("feed.trending") },
    { value: "recent", label: t("feed.recent") },
  ];

  const handleRefresh = useCallback(async () => {
    setPosts([]);
    setHasMore(true);
    await fetchPosts(0, false);
  }, [filter, user?.id]);

  const { pullDistance, isRefreshing, containerRef } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

  return (
    <div ref={containerRef} className="max-w-2xl mx-auto">
      {/* Pull to refresh indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        threshold={80}
      />

      <MemberCoverHeader />
      {user ? <PostCreator onPostCreated={() => fetchPosts(0, false)} /> : <DemoPostCreator />}

      {/* Filter tabs */}
      <div className="flex items-center justify-end mb-4 gap-2">
        <span className="text-sm text-muted-foreground">{t("feed.sortBy")}:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-foreground font-medium">
              {getFilterLabel()}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {filterOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleFilterChange(option.value)}
                className="flex items-center justify-between cursor-pointer"
              >
                {option.label}
                {filter === option.value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Posts */}
      {loading && !isRefreshing ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Show real posts if user is logged in or has posts */}
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onLikeChange={() => fetchPosts(0, false)} />
          ))}
          
          {/* Only show demo posts when user is not logged in AND has no real posts */}
          {!user && posts.length === 0 && demoPosts.map((post) => (
            <DemoPostCard key={post.id} post={post} />
          ))}

          {/* Infinite scroll trigger / Load more */}
          {hasMore && posts.length > 0 && (
            <div ref={loadMoreRef} className="flex justify-center py-6">
              {loadingMore ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Button 
                  variant="outline" 
                  onClick={loadMore}
                  className="text-muted-foreground"
                >
                  {t("feed.loadMore", "Load More")}
                </Button>
              )}
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              {t("feed.noMorePosts", "You've reached the end")}
            </div>
          )}
        </>
      )}
    </div>
  );
};
