import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface VirtualPostcard {
  id: string;
  sender_id: string;
  receiver_id: string;
  template: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  sender_profile?: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const POSTCARD_TEMPLATES = [
  { id: "classic", name: "Classic", gradient: "from-amber-200 to-orange-300", emoji: "✉️" },
  { id: "friendship", name: "Friendship", gradient: "from-pink-200 to-rose-300", emoji: "💕" },
  { id: "travel", name: "Travel", gradient: "from-blue-200 to-cyan-300", emoji: "✈️" },
  { id: "nature", name: "Nature", gradient: "from-green-200 to-emerald-300", emoji: "🌿" },
  { id: "celebration", name: "Celebration", gradient: "from-purple-200 to-violet-300", emoji: "🎉" },
  { id: "gratitude", name: "Gratitude", gradient: "from-yellow-200 to-amber-300", emoji: "🙏" },
];

export const useVirtualPostcards = () => {
  const { user } = useAuth();
  const [receivedPostcards, setReceivedPostcards] = useState<VirtualPostcard[]>([]);
  const [sentPostcards, setSentPostcards] = useState<VirtualPostcard[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchPostcards = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch received postcards
      const { data: received, error: recError } = await supabase
        .from("virtual_postcards")
        .select("*")
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false });

      if (recError) throw recError;

      // Fetch sent postcards
      const { data: sent, error: sentError } = await supabase
        .from("virtual_postcards")
        .select("*")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false });

      if (sentError) throw sentError;

      // Get sender profiles for received postcards
      const senderIds = received?.map((p) => p.sender_id) || [];
      let profileMap = new Map();

      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("safe_profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", senderIds);

        profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      }

      const enrichedReceived = (received || []).map((p) => ({
        ...p,
        sender_profile: profileMap.get(p.sender_id),
      }));

      setReceivedPostcards(enrichedReceived);
      setSentPostcards(sent || []);
      setUnreadCount(enrichedReceived.filter((p) => !p.is_read).length);
    } catch (error) {
      console.error("Error fetching postcards:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendPostcard = async (
    receiverId: string,
    template: string,
    message?: string
  ) => {
    if (!user) return false;

    setSending(true);
    try {
      const { error } = await supabase.from("virtual_postcards").insert({
        sender_id: user.id,
        receiver_id: receiverId,
        template,
        message: message || null,
      });

      if (error) throw error;

      toast.success("Postcard sent! 💌");
      await fetchPostcards();
      return true;
    } catch (error) {
      console.error("Error sending postcard:", error);
      toast.error("Failed to send postcard");
      return false;
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (postcardId: string) => {
    if (!user) return;

    try {
      await supabase
        .from("virtual_postcards")
        .update({ is_read: true })
        .eq("id", postcardId);

      setReceivedPostcards((prev) =>
        prev.map((p) => (p.id === postcardId ? { ...p, is_read: true } : p))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking postcard as read:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPostcards();
    }
  }, [user, fetchPostcards]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("virtual_postcards_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "virtual_postcards",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchPostcards();
          toast.info("You received a new postcard! 💌");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPostcards]);

  return {
    receivedPostcards,
    sentPostcards,
    unreadCount,
    loading,
    sending,
    sendPostcard,
    markAsRead,
    refreshPostcards: fetchPostcards,
  };
};
