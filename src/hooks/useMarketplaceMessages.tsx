import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface MarketplaceMessage {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_offer: boolean;
  offer_amount: number | null;
  read_at: string | null;
  created_at: string;
  sender?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  receiver?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  listing?: {
    id: string;
    title: string;
    price: number;
    currency: string;
    images: string[];
    status: string;
  };
}

export interface Conversation {
  listing_id: string;
  other_user_id: string;
  other_user: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  listing: {
    id: string;
    title: string;
    price: number;
    currency: string;
    images: string[];
    status: string;
  };
  last_message: MarketplaceMessage;
  unread_count: number;
}

export const useMarketplaceMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    // Get all messages where user is sender or receiver
    const { data: messages, error } = await supabase
      .from("marketplace_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching messages:", error);
      setIsLoading(false);
      return;
    }

    if (!messages || messages.length === 0) {
      setConversations([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    // Group by listing_id + other_user_id
    const conversationMap = new Map<string, {
      listing_id: string;
      other_user_id: string;
      messages: typeof messages;
      unread_count: number;
    }>();

    messages.forEach((msg) => {
      const other_user_id = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      const key = `${msg.listing_id}-${other_user_id}`;
      
      if (!conversationMap.has(key)) {
        conversationMap.set(key, {
          listing_id: msg.listing_id,
          other_user_id,
          messages: [],
          unread_count: 0,
        });
      }
      
      const conv = conversationMap.get(key)!;
      conv.messages.push(msg);
      
      // Count unread messages sent to this user
      if (msg.receiver_id === user.id && !msg.read_at) {
        conv.unread_count++;
      }
    });

    // Get unique listing IDs and user IDs
    const listingIds = [...new Set(messages.map((m) => m.listing_id))];
    const userIds = [...new Set(
      messages.flatMap((m) => [m.sender_id, m.receiver_id]).filter((id) => id !== user.id)
    )];

    // Fetch listings and profiles
    const [{ data: listings }, { data: profiles }] = await Promise.all([
      supabase
        .from("marketplace_listings")
        .select("id, title, price, currency, images, status")
        .in("id", listingIds),
      supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", userIds),
    ]);

    const listingMap = new Map(listings?.map((l) => [l.id, l]) || []);
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    // Build conversations array
    const convArray: Conversation[] = [];
    let totalUnread = 0;

    conversationMap.forEach((conv) => {
      const listing = listingMap.get(conv.listing_id);
      const otherUser = profileMap.get(conv.other_user_id);
      
      if (listing && otherUser) {
        convArray.push({
          listing_id: conv.listing_id,
          other_user_id: conv.other_user_id,
          other_user: otherUser,
          listing,
          last_message: conv.messages[0] as MarketplaceMessage,
          unread_count: conv.unread_count,
        });
        totalUnread += conv.unread_count;
      }
    });

    // Sort by last message date
    convArray.sort((a, b) => 
      new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime()
    );

    setConversations(convArray);
    setUnreadCount(totalUnread);
    setIsLoading(false);
  }, [user]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("marketplace-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marketplace_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marketplace_messages",
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    unreadCount,
    isLoading,
    refetch: fetchConversations,
  };
};

export const useConversationThread = (
  listingId: string | undefined,
  otherUserId: string | undefined
) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [listing, setListing] = useState<MarketplaceMessage["listing"] | null>(null);
  const [otherUser, setOtherUser] = useState<MarketplaceMessage["sender"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const fetchThread = useCallback(async () => {
    if (!user || !listingId || !otherUserId) {
      setIsLoading(false);
      return;
    }

    // Fetch messages for this conversation
    const { data: messagesData, error } = await supabase
      .from("marketplace_messages")
      .select("*")
      .eq("listing_id", listingId)
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching thread:", error);
      setIsLoading(false);
      return;
    }

    // Fetch listing and other user profile
    const [{ data: listingData }, { data: profileData }] = await Promise.all([
      supabase
        .from("marketplace_listings")
        .select("id, title, price, currency, images, status")
        .eq("id", listingId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .eq("user_id", otherUserId)
        .maybeSingle(),
    ]);

    setMessages(messagesData || []);
    setListing(listingData);
    setOtherUser(profileData);
    setIsLoading(false);

    // Mark unread messages as read
    if (messagesData?.length) {
      const unreadIds = messagesData
        .filter((m) => m.receiver_id === user.id && !m.read_at)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("marketplace_messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds);
      }
    }
  }, [user, listingId, otherUserId]);

  // Send message
  const sendMessage = async (content: string, isOffer = false, offerAmount?: number) => {
    if (!user || !listingId || !otherUserId || !content.trim()) return false;

    setIsSending(true);

    const { error } = await supabase.from("marketplace_messages").insert({
      listing_id: listingId,
      sender_id: user.id,
      receiver_id: otherUserId,
      content: content.trim(),
      is_offer: isOffer,
      offer_amount: isOffer && offerAmount ? offerAmount : null,
    });

    setIsSending(false);

    if (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      return false;
    }

    await fetchThread();
    return true;
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!user || !listingId) return;

    const channel = supabase
      .channel(`conversation-${listingId}-${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "marketplace_messages",
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          fetchThread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, listingId, otherUserId, fetchThread]);

  // Initial fetch
  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  return {
    messages,
    listing,
    otherUser,
    isLoading,
    isSending,
    sendMessage,
    refetch: fetchThread,
  };
};
