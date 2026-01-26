import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Event {
  id: string;
  creator_id: string;
  group_id: string | null;
  title: string;
  description: string | null;
  cover_url: string | null;
  category: string;
  privacy: string;
  location_name: string | null;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  start_date: string;
  end_date: string | null;
  timezone: string;
  going_count: number;
  interested_count: number;
  created_at: string;
  updated_at: string;
  creator?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  user_rsvp?: string | null;
}

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

export interface EventRSVP {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  replies?: EventComment[];
}

export interface EventMedia {
  id: string;
  event_id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export const useEventCategories = () => {
  return useQuery({
    queryKey: ["event-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as EventCategory[];
    },
  });
};

export const useEvents = (filter?: { category?: string; privacy?: string; upcoming?: boolean }) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["events", filter],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: true });

      if (filter?.category) {
        query = query.eq("category", filter.category);
      }

      if (filter?.upcoming) {
        query = query.gte("start_date", new Date().toISOString());
      }

      const { data: events, error } = await query;
      if (error) throw error;

      // Get creator profiles
      const creatorIds = [...new Set(events.map((e) => e.creator_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", creatorIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      // Get user's RSVPs if logged in
      let rsvpMap = new Map<string, string>();
      if (user) {
        const { data: rsvps } = await supabase
          .from("event_rsvps")
          .select("event_id, status")
          .eq("user_id", user.id);

        rsvpMap = new Map(rsvps?.map((r) => [r.event_id, r.status]) || []);
      }

      return events.map((event) => ({
        ...event,
        creator: profileMap.get(event.creator_id) || null,
        user_rsvp: rsvpMap.get(event.id) || null,
      })) as Event[];
    },
  });
};

export const useEvent = (eventId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["event", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data: event, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

      if (error) throw error;
      if (!event) return null;

      // Get creator profile
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .eq("user_id", event.creator_id)
        .maybeSingle();

      // Get user's RSVP if logged in
      let userRsvp = null;
      if (user) {
        const { data: rsvp } = await supabase
          .from("event_rsvps")
          .select("status")
          .eq("event_id", eventId)
          .eq("user_id", user.id)
          .maybeSingle();

        userRsvp = rsvp?.status || null;
      }

      return {
        ...event,
        creator: creatorProfile,
        user_rsvp: userRsvp,
      } as Event;
    },
  });
};

export const useEventRSVPs = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["event-rsvps", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data: rsvps, error } = await supabase
        .from("event_rsvps")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get profiles
      const userIds = [...new Set(rsvps.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return rsvps.map((rsvp) => ({
        ...rsvp,
        profile: profileMap.get(rsvp.user_id) || null,
      })) as EventRSVP[];
    },
  });
};

export const useEventComments = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["event-comments", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from("event_comments")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get profiles
      const userIds = [...new Set(comments.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      // Build comment tree
      const commentMap = new Map<string, EventComment>();
      const rootComments: EventComment[] = [];

      comments.forEach((comment) => {
        const enrichedComment: EventComment = {
          ...comment,
          profile: profileMap.get(comment.user_id) || null,
          replies: [],
        };
        commentMap.set(comment.id, enrichedComment);
      });

      comments.forEach((comment) => {
        const enrichedComment = commentMap.get(comment.id)!;
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies?.push(enrichedComment);
          }
        } else {
          rootComments.push(enrichedComment);
        }
      });

      return rootComments;
    },
  });
};

export const useEventMedia = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["event-media", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data: media, error } = await supabase
        .from("event_media")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get profiles
      const userIds = [...new Set(media.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return media.map((m) => ({
        ...m,
        profile: profileMap.get(m.user_id) || null,
      })) as EventMedia[];
    },
  });
};

export const useUserEvents = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return { created: [], attending: [], invited: [] };

      // Get created events
      const { data: created } = await supabase
        .from("events")
        .select("*")
        .eq("creator_id", user.id)
        .order("start_date", { ascending: true });

      // Get events user is attending
      const { data: rsvps } = await supabase
        .from("event_rsvps")
        .select("event_id, status")
        .eq("user_id", user.id)
        .in("status", ["going", "interested"]);

      const attendingIds = rsvps?.map((r) => r.event_id) || [];
      let attending: Event[] = [];
      if (attendingIds.length > 0) {
        const { data } = await supabase
          .from("events")
          .select("*")
          .in("id", attendingIds)
          .order("start_date", { ascending: true });

        attending = data || [];
      }

      // Get invited events
      const { data: invitations } = await supabase
        .from("event_invitations")
        .select("event_id")
        .eq("invitee_id", user.id)
        .eq("status", "pending");

      const invitedIds = invitations?.map((i) => i.event_id) || [];
      let invited: Event[] = [];
      if (invitedIds.length > 0) {
        const { data } = await supabase
          .from("events")
          .select("*")
          .in("id", invitedIds)
          .order("start_date", { ascending: true });

        invited = data || [];
      }

      return {
        created: created || [],
        attending,
        invited,
      };
    },
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (eventData: {
      title: string;
      description?: string;
      cover_url?: string;
      category: string;
      privacy: string;
      location_name?: string;
      location_address?: string;
      start_date: string;
      end_date?: string;
      group_id?: string;
    }) => {
      if (!user) throw new Error("Must be logged in");

      const { data, error } = await supabase
        .from("events")
        .insert({
          ...eventData,
          creator_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["user-events"] });
      toast.success("Event created successfully!");
    },
    onError: (error) => {
      console.error("Create event error:", error);
      toast.error("Failed to create event");
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      ...eventData
    }: {
      eventId: string;
      title?: string;
      description?: string;
      cover_url?: string;
      category?: string;
      privacy?: string;
      location_name?: string;
      location_address?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      const { data, error } = await supabase
        .from("events")
        .update({ ...eventData, updated_at: new Date().toISOString() })
        .eq("id", eventId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event", data.id] });
      queryClient.invalidateQueries({ queryKey: ["user-events"] });
      toast.success("Event updated!");
    },
    onError: (error) => {
      console.error("Update event error:", error);
      toast.error("Failed to update event");
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["user-events"] });
      toast.success("Event deleted");
    },
    onError: (error) => {
      console.error("Delete event error:", error);
      toast.error("Failed to delete event");
    },
  });
};

export const useRSVP = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      eventId,
      status,
    }: {
      eventId: string;
      status: "going" | "interested" | "not_going" | null;
    }) => {
      if (!user) throw new Error("Must be logged in");

      if (status === null || status === "not_going") {
        // Remove RSVP
        const { error } = await supabase
          .from("event_rsvps")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", user.id);

        if (error) throw error;
        return null;
      }

      // Upsert RSVP
      const { data, error } = await supabase
        .from("event_rsvps")
        .upsert(
          {
            event_id: eventId,
            user_id: user.id,
            status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "event_id,user_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-rsvps", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["user-events"] });
    },
    onError: (error) => {
      console.error("RSVP error:", error);
      toast.error("Failed to update RSVP");
    },
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      eventId,
      content,
      parentCommentId,
    }: {
      eventId: string;
      content: string;
      parentCommentId?: string;
    }) => {
      if (!user) throw new Error("Must be logged in");

      const { data, error } = await supabase
        .from("event_comments")
        .insert({
          event_id: eventId,
          user_id: user.id,
          content,
          parent_comment_id: parentCommentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event-comments", variables.eventId] });
    },
    onError: (error) => {
      console.error("Add comment error:", error);
      toast.error("Failed to add comment");
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, eventId }: { commentId: string; eventId: string }) => {
      const { error } = await supabase.from("event_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event-comments", variables.eventId] });
    },
    onError: (error) => {
      console.error("Delete comment error:", error);
      toast.error("Failed to delete comment");
    },
  });
};

export const useUploadEventMedia = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      eventId,
      file,
      caption,
    }: {
      eventId: string;
      file: File;
      caption?: string;
    }) => {
      if (!user) throw new Error("Must be logged in");

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${eventId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("event-media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("event-media")
        .getPublicUrl(fileName);

      // Create media record
      const mediaType = file.type.startsWith("video/") ? "video" : "image";

      const { data, error } = await supabase
        .from("event_media")
        .insert({
          event_id: eventId,
          user_id: user.id,
          media_url: urlData.publicUrl,
          media_type: mediaType,
          caption,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event-media", variables.eventId] });
      toast.success("Media uploaded!");
    },
    onError: (error) => {
      console.error("Upload media error:", error);
      toast.error("Failed to upload media");
    },
  });
};

export const useInviteToEvent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      eventId,
      inviteeIds,
    }: {
      eventId: string;
      inviteeIds: string[];
    }) => {
      if (!user) throw new Error("Must be logged in");

      const invitations = inviteeIds.map((inviteeId) => ({
        event_id: eventId,
        inviter_id: user.id,
        invitee_id: inviteeId,
        status: "pending",
      }));

      const { data, error } = await supabase
        .from("event_invitations")
        .upsert(invitations, { onConflict: "event_id,invitee_id" })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-events"] });
      toast.success("Invitations sent!");
    },
    onError: (error) => {
      console.error("Invite error:", error);
      toast.error("Failed to send invitations");
    },
  });
};
