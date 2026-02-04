import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface PenPalRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  sender_profile?: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

export const usePenPalRequests = () => {
  const { user } = useAuth();
  const [incomingRequests, setIncomingRequests] = useState<PenPalRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<PenPalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!user) return;

    try {
      // Get incoming requests
      const { data: incoming, error: inError } = await supabase
        .from("penpal_requests")
        .select("*")
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (inError) throw inError;

      // Get outgoing requests
      const { data: outgoing, error: outError } = await supabase
        .from("penpal_requests")
        .select("*")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false });

      if (outError) throw outError;

      // Get sender profiles for incoming requests
      const senderIds = incoming?.map((r) => r.sender_id) || [];
      let profileMap = new Map();

      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("safe_profiles")
          .select("user_id, username, display_name, first_name, last_name, avatar_url")
          .in("user_id", senderIds);

        profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      }

      const enrichedIncoming = (incoming || []).map((r) => ({
        ...r,
        status: r.status as "pending" | "accepted" | "declined",
        sender_profile: profileMap.get(r.sender_id),
      }));

      setIncomingRequests(enrichedIncoming);
      setOutgoingRequests(
        (outgoing || []).map((r) => ({
          ...r,
          status: r.status as "pending" | "accepted" | "declined",
        }))
      );
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendRequest = async (receiverId: string, message?: string) => {
    if (!user) return false;

    setProcessing(receiverId);
    try {
      const { error } = await supabase.from("penpal_requests").insert({
        sender_id: user.id,
        receiver_id: receiverId,
        message: message || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("You already sent a request to this person");
        } else {
          throw error;
        }
        return false;
      }

      toast.success("Connection request sent!");
      await fetchRequests();
      return true;
    } catch (error) {
      console.error("Error sending request:", error);
      toast.error("Failed to send request");
      return false;
    } finally {
      setProcessing(null);
    }
  };

  const acceptRequest = async (requestId: string) => {
    if (!user) return false;

    setProcessing(requestId);
    try {
      // Get the request
      const { data: request, error: fetchError } = await supabase
        .from("penpal_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      // Update request status
      const { error: updateError } = await supabase
        .from("penpal_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Create connection
      const { error: connectionError } = await supabase
        .from("penpal_connections")
        .insert({
          user_id: request.receiver_id,
          penpal_id: request.sender_id,
        });

      if (connectionError && connectionError.code !== "23505") {
        throw connectionError;
      }

      toast.success("Request accepted! You're now pen pals.");
      await fetchRequests();
      return true;
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Failed to accept request");
      return false;
    } finally {
      setProcessing(null);
    }
  };

  const declineRequest = async (requestId: string) => {
    if (!user) return false;

    setProcessing(requestId);
    try {
      const { error } = await supabase
        .from("penpal_requests")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Request declined");
      await fetchRequests();
      return true;
    } catch (error) {
      console.error("Error declining request:", error);
      toast.error("Failed to decline request");
      return false;
    } finally {
      setProcessing(null);
    }
  };

  const cancelRequest = async (requestId: string) => {
    if (!user) return false;

    setProcessing(requestId);
    try {
      const { error } = await supabase
        .from("penpal_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Request cancelled");
      await fetchRequests();
      return true;
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error("Failed to cancel request");
      return false;
    } finally {
      setProcessing(null);
    }
  };

  const hasPendingRequest = (userId: string) => {
    return outgoingRequests.some(
      (r) => r.receiver_id === userId && r.status === "pending"
    );
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("penpal_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "penpal_requests",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => fetchRequests()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "penpal_requests",
          filter: `sender_id=eq.${user.id}`,
        },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchRequests]);

  return {
    incomingRequests,
    outgoingRequests,
    loading,
    processing,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    hasPendingRequest,
    refreshRequests: fetchRequests,
  };
};
