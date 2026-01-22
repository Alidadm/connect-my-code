import React, { useState, useEffect, useRef, useCallback } from "react";
import { MemberCoverHeader } from "./MemberCoverHeader";
import { PostCreator } from "./PostCreator";
import { DemoPostCreator } from "./DemoPostCreator";
import { PostCard } from "./PostCard";
import { DemoPostCard } from "./DemoPostCard";
import { PullToRefreshIndicator } from "./PullToRefreshIndicator";
import { ProfileTabContent } from "./ProfileTabContent";
import { TodaysBirthdays } from "./TodaysBirthdays";
import { ShortVideosRow } from "./ShortVideosRow";
import { ScrollProgressIndicator } from "./ScrollProgressIndicator";
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

// Section IDs for smooth scrolling
const SECTION_IDS = {
  feed: "feed-section",
  posts: "feed-section",
  photos: "photos-section",
  videos: "videos-section",
  friends: "friends-section",
  blogs: "blogs-section",
};

interface Post {
  id: string;
  content: string | null;
  media_urls: string[] | null;
  youtube_urls?: string[] | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  user_id: string;
  is_platform_post?: boolean;
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
  const [activeTab, setActiveTab] = useState("feed");
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [isTabsSticky, setIsTabsSticky] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Fetch blocked and muted user IDs
  const fetchBlockedUsers = useCallback(async () => {
    if (!user) {
      setBlockedUserIds(new Set());
      return;
    }

    const [blockedResult, mutedResult] = await Promise.all([
      supabase
        .from("blocked_users")
        .select("blocked_user_id")
        .eq("user_id", user.id),
      supabase
        .from("muted_users")
        .select("muted_user_id")
        .eq("user_id", user.id),
    ]);

    const blockedIds = new Set<string>([
      ...(blockedResult.data?.map(b => b.blocked_user_id) || []),
      ...(mutedResult.data?.map(m => m.muted_user_id) || []),
    ]);

    setBlockedUserIds(blockedIds);
  }, [user]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

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

      // Always fetch platform posts first (visible to all authenticated users)
      let platformPosts: any[] = [];
      if (user) {
        const { data: platformData } = await supabase
          .from("posts")
          .select("*")
          .eq("is_platform_post", true)
          .order("created_at", { ascending: false });
        platformPosts = platformData || [];
      }

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
            .eq("is_platform_post", false)
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
          .eq("is_platform_post", false)
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
            .eq("is_platform_post", false)
            .order("created_at", { ascending: false })
            .range(offset, offset + POSTS_PER_PAGE - 1);

          if (publicError) throw publicError;

          const { data: myPosts, error: myError } = await supabase
            .from("posts")
            .select("*")
            .eq("user_id", user.id)
            .neq("visibility", "public")
            .eq("is_platform_post", false)
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
            .eq("is_platform_post", false)
            .order("created_at", { ascending: false })
            .range(offset, offset + POSTS_PER_PAGE - 1);

          if (error) throw error;
          postsData = data || [];
        }
      }

      // Merge platform posts with regular posts (platform posts show at the top on first page)
      if (offset === 0 && platformPosts.length > 0) {
        // Combine and sort by created_at, platform posts are mixed in chronologically
        postsData = [...platformPosts, ...postsData].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }

      // Check if we have more posts to load
      setHasMore(postsData.length === POSTS_PER_PAGE);

      // Filter out blocked/muted users
      const filteredPosts = postsData.filter(
        (post) => !blockedUserIds.has(post.user_id)
      );

      // Fetch profiles and update state
      const postsWithProfiles = await fetchPostsWithProfiles(filteredPosts);
      
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
          // Skip posts from blocked/muted users
          if (blockedUserIds.has(newPost.user_id)) return;
          
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
  }, [filter, user?.id, blockedUserIds]);

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

  // Handle tab change with smooth scroll
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    
    // Smooth scroll to content section after a brief delay for state update
    setTimeout(() => {
      if (contentRef.current) {
        const headerOffset = 80; // Account for sticky header
        const elementPosition = contentRef.current.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    }, 100);
  }, []);

  return (
    <div ref={containerRef} className="max-w-2xl mx-auto scroll-smooth">
      {/* Scroll progress indicator */}
      <ScrollProgressIndicator />
      
      {/* Pull to refresh indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        threshold={80}
      />

      <MemberCoverHeader 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        onStickyChange={setIsTabsSticky}
      />
      {/* Content Section */}
      <div ref={contentRef} id={SECTION_IDS[activeTab as keyof typeof SECTION_IDS] || "feed-section"}>
        {/* Show tab content based on active tab */}
        {activeTab === "feed" || activeTab === "posts" ? (
          <>
          {/* Today's Birthdays section */}
          <TodaysBirthdays />

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
              {posts.map((post, index) => (
                <React.Fragment key={post.id}>
                  <PostCard post={post} onLikeChange={() => fetchPosts(0, false)} />
                  {/* Show short videos row after every 3 posts */}
                  {(index + 1) % 3 === 0 && index < posts.length - 1 && (
                    <ShortVideosRow />
                  )}
                </React.Fragment>
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
        </>
        ) : (
          /* Show Photos, Videos, or Friends content */
          <div className="bg-card rounded-xl shadow-sm mt-4 animate-fade-in">
            <ProfileTabContent activeTab={activeTab} />
          </div>
        )}
      </div>
    </div>
  );
};
