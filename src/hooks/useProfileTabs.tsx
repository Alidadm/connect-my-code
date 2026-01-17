import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Photo {
  id: string;
  url: string;
  postId: string;
  createdAt: string;
}

interface Video {
  id: string;
  url: string;
  postId: string;
  createdAt: string;
}

interface Friend {
  id: string;
  friendshipId: string;
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  isVerified: boolean | null;
}

// Hook to fetch user's photos from posts
export const useUserPhotos = (userId: string | undefined, enabled: boolean) => {
  return useQuery({
    queryKey: ["userPhotos", userId],
    queryFn: async (): Promise<Photo[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("posts")
        .select("id, media_urls, created_at")
        .eq("user_id", userId)
        .not("media_urls", "is", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching photos:", error);
        return [];
      }

      // Extract image URLs from posts
      const photos: Photo[] = [];
      data?.forEach((post) => {
        post.media_urls?.forEach((url: string, index: number) => {
          // Filter for image files
          if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.includes("image")) {
            photos.push({
              id: `${post.id}-${index}`,
              url,
              postId: post.id,
              createdAt: post.created_at,
            });
          }
        });
      });

      return photos;
    },
    enabled: enabled && !!userId,
    staleTime: 30000,
  });
};

// Hook to fetch user's videos from posts
export const useUserVideos = (userId: string | undefined, enabled: boolean) => {
  return useQuery({
    queryKey: ["userVideos", userId],
    queryFn: async (): Promise<Video[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("posts")
        .select("id, media_urls, created_at")
        .eq("user_id", userId)
        .not("media_urls", "is", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching videos:", error);
        return [];
      }

      // Extract video URLs from posts
      const videos: Video[] = [];
      data?.forEach((post) => {
        post.media_urls?.forEach((url: string, index: number) => {
          // Filter for video files
          if (url.match(/\.(mp4|webm|mov|avi)$/i) || url.includes("video")) {
            videos.push({
              id: `${post.id}-${index}`,
              url,
              postId: post.id,
              createdAt: post.created_at,
            });
          }
        });
      });

      return videos;
    },
    enabled: enabled && !!userId,
    staleTime: 30000,
  });
};

// Hook to fetch user's friends
export const useUserFriends = (userId: string | undefined, enabled: boolean) => {
  return useQuery({
    queryKey: ["userFriendsList", userId],
    queryFn: async (): Promise<Friend[]> => {
      if (!userId) return [];

      // Get all accepted friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq("status", "accepted");

      if (friendshipsError) {
        console.error("Error fetching friendships:", friendshipsError);
        return [];
      }

      if (!friendships || friendships.length === 0) return [];

      // Get friend user IDs
      const friendUserIds = friendships.map((f) =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      );

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, is_verified")
        .in("user_id", friendUserIds);

      if (profilesError) {
        console.error("Error fetching friend profiles:", profilesError);
        return [];
      }

      // Map profiles to friends
      const profilesMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return friendships.map((f) => {
        const friendUserId = f.requester_id === userId ? f.addressee_id : f.requester_id;
        const profile = profilesMap.get(friendUserId);
        return {
          id: friendUserId,
          friendshipId: f.id,
          userId: friendUserId,
          displayName: profile?.display_name || null,
          username: profile?.username || null,
          avatarUrl: profile?.avatar_url || null,
          isVerified: profile?.is_verified || null,
        };
      });
    },
    enabled: enabled && !!userId,
    staleTime: 30000,
  });
};
