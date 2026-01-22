import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  sender?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

export interface Conversation {
  other_user_id: string;
  other_user: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  last_message: Message | null;
  unread_count: number;
}

export const useDirectMessages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all conversations
  const { data: conversations = [], isLoading: loadingConversations, refetch: refetchConversations } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get all messages involving the user
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const conversationMap = new Map<string, { messages: Message[]; unreadCount: number }>();
      
      messages?.forEach((msg) => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!conversationMap.has(otherId)) {
          conversationMap.set(otherId, { messages: [], unreadCount: 0 });
        }
        const conv = conversationMap.get(otherId)!;
        conv.messages.push(msg);
        if (!msg.read_at && msg.receiver_id === user.id) {
          conv.unreadCount++;
        }
      });

      // Get profiles for all conversation partners
      const otherUserIds = Array.from(conversationMap.keys());
      if (otherUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("safe_profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", otherUserIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      // Build conversation list
      const convList: Conversation[] = [];
      conversationMap.forEach((data, oderId) => {
        const profile = profileMap.get(oderId);
        if (profile) {
          convList.push({
            other_user_id: oderId,
            other_user: {
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              username: profile.username,
            },
            last_message: data.messages[0] || null,
            unread_count: data.unreadCount,
          });
        }
      });

      // Sort by last message time
      convList.sort((a, b) => {
        const timeA = a.last_message?.created_at || "";
        const timeB = b.last_message?.created_at || "";
        return timeB.localeCompare(timeA);
      });

      return convList;
    },
    enabled: !!user,
  });

  // Get total unread count
  const totalUnreadCount = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  // Mark messages as read
  const markAsRead = useCallback(async (otherUserId: string) => {
    if (!user) return;

    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("sender_id", otherUserId)
      .eq("receiver_id", user.id)
      .is("read_at", null);

    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [user, queryClient]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({ queryKey: ["messages"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    conversations,
    loadingConversations,
    totalUnreadCount,
    sendMessage,
    markAsRead,
    refetchConversations,
  };
};

export const useConversationMessages = (otherUserId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", user?.id, otherUserId],
    queryFn: async () => {
      if (!user || !otherUserId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!user && !!otherUserId,
    refetchInterval: 5000, // Poll every 5 seconds as backup
  });

  // Subscribe to new messages in this conversation
  useEffect(() => {
    if (!user || !otherUserId) return;

    const channel = supabase
      .channel(`conversation-${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user.id && msg.receiver_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.receiver_id === user.id)
          ) {
            queryClient.invalidateQueries({ queryKey: ["messages", user.id, otherUserId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherUserId, queryClient]);

  return { messages, isLoading };
};
