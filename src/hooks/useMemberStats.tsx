import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MemberStats {
  followers: number;
  following: number;
  posts: number;
}

interface UserGroup {
  id: string;
  name: string;
  avatar_url: string | null;
  member_count: number | null;
  creator_id: string;
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

export const useUserGroups = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["userGroups", user?.id],
    queryFn: async (): Promise<UserGroup[]> => {
      if (!user?.id) {
        return [];
      }

      // Fetch groups where user is a member (includes created groups since creator is auto-added as member)
      const { data: membershipData, error: membershipError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (membershipError) {
        console.error("Error fetching group memberships:", membershipError);
        return [];
      }

      if (!membershipData || membershipData.length === 0) {
        return [];
      }

      const groupIds = membershipData.map((m) => m.group_id);

      const { data, error } = await supabase
        .from("groups")
        .select("id, name, avatar_url, member_count, creator_id")
        .in("id", groupIds)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching user groups:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 30000,
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
