
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'friend_request', 'friend_accepted', 'post_like', 'post_comment', 'event_invite', 'event_reminder', 'birthday', 'group_invite', 'mention', 'penpal_request'
  title TEXT NOT NULL,
  message TEXT,
  actor_id UUID, -- the user who triggered the notification
  reference_id TEXT, -- ID of the related entity (post, event, group, etc.)
  reference_type TEXT, -- 'post', 'event', 'group', 'friendship', 'penpal', etc.
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Allow system inserts (via triggers with security definer)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function: notify on friend request
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_name TEXT;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name
  FROM profiles WHERE user_id = NEW.requester_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, message, actor_id, reference_id, reference_type)
    VALUES (NEW.addressee_id, 'friend_request', 'New Friend Request', actor_name || ' sent you a friend request', NEW.requester_id, NEW.id, 'friendship');
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, message, actor_id, reference_id, reference_type)
    VALUES (NEW.requester_id, 'friend_accepted', 'Friend Request Accepted', actor_name || ' accepted your friend request', NEW.addressee_id, NEW.id, 'friendship');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_friendship_change
AFTER INSERT OR UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.notify_friend_request();

-- Trigger function: notify on post like
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_name TEXT;
  post_owner UUID;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name
  FROM profiles WHERE user_id = NEW.user_id;

  SELECT user_id INTO post_owner FROM posts WHERE id = NEW.post_id;

  -- Don't notify if user liked their own post
  IF post_owner IS NOT NULL AND post_owner != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, actor_id, reference_id, reference_type)
    VALUES (post_owner, 'post_like', 'New Like', actor_name || ' liked your post', NEW.user_id, NEW.post_id, 'post');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_post_like
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_post_like();

-- Trigger function: notify on post comment
CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_name TEXT;
  post_owner UUID;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name
  FROM profiles WHERE user_id = NEW.user_id;

  SELECT user_id INTO post_owner FROM posts WHERE id = NEW.post_id;

  -- Don't notify if user commented on their own post
  IF post_owner IS NOT NULL AND post_owner != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, actor_id, reference_id, reference_type)
    VALUES (post_owner, 'post_comment', 'New Comment', actor_name || ' commented on your post', NEW.user_id, NEW.post_id, 'post');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_post_comment
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_post_comment();

-- Trigger function: notify on event invitation
CREATE OR REPLACE FUNCTION public.notify_event_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_name TEXT;
  event_title TEXT;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name
  FROM profiles WHERE user_id = NEW.inviter_id;

  SELECT title INTO event_title FROM events WHERE id = NEW.event_id;

  INSERT INTO notifications (user_id, type, title, message, actor_id, reference_id, reference_type)
  VALUES (NEW.invitee_id, 'event_invite', 'Event Invitation', actor_name || ' invited you to "' || COALESCE(event_title, 'an event') || '"', NEW.inviter_id, NEW.event_id, 'event');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_event_invite
AFTER INSERT ON public.event_invitations
FOR EACH ROW EXECUTE FUNCTION public.notify_event_invite();

-- Trigger function: notify on group invitation
CREATE OR REPLACE FUNCTION public.notify_group_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_name TEXT;
  group_name TEXT;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name
  FROM profiles WHERE user_id = NEW.inviter_id;

  SELECT name INTO group_name FROM groups WHERE id = NEW.group_id;

  INSERT INTO notifications (user_id, type, title, message, actor_id, reference_id, reference_type)
  VALUES (NEW.invitee_id, 'group_invite', 'Group Invitation', actor_name || ' invited you to join "' || COALESCE(group_name, 'a group') || '"', NEW.inviter_id, NEW.group_id, 'group');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_group_invite
AFTER INSERT ON public.group_invitations
FOR EACH ROW EXECUTE FUNCTION public.notify_group_invite();
