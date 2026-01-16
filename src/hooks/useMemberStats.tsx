import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MemberStats {
  followers: number;
  following: number;
  posts: number;
}

export const useMemberStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["memberStats", user?.id],
    queryFn: async (): Promise<MemberStats> => {
      if (!user?.id) {
        return { followers: 0, following: 0, posts: 0 };
      }

      // Fetch all stats in parallel
      const [followersResult, followingResult, postsResult] = await Promise.all([
        // Count followers (people who sent friend request to this user and were accepted)
        supabase
          .from("friendships")
          .select("id", { count: "exact", head: true })
          .eq("addressee_id", user.id)
          .eq("status", "accepted"),
        
        // Count following (people this user sent friend request to and were accepted)
        supabase
          .from("friendships")
          .select("id", { count: "exact", head: true })
          .eq("requester_id", user.id)
          .eq("status", "accepted"),
        
        // Count posts by this user
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      return {
        followers: followersResult.count || 0,
        following: followingResult.count || 0,
        posts: postsResult.count || 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
  });
};

// Helper to format numbers (e.g., 1234 -> 1.2k)
export const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return count.toString();
};
