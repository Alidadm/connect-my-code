-- Drop existing events table and recreate with full feature set
DROP TABLE IF EXISTS event_rsvps CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- Create enhanced events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  privacy TEXT NOT NULL DEFAULT 'public',
  location_name TEXT,
  location_address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  timezone TEXT DEFAULT 'UTC',
  going_count INTEGER DEFAULT 0,
  interested_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event RSVPs table
CREATE TABLE public.event_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'going',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create event invitations table
CREATE TABLE public.event_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL,
  invitee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, invitee_id)
);

-- Create event media table (photos/videos)
CREATE TABLE public.event_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event comments/discussion table
CREATE TABLE public.event_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES public.event_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event categories table
CREATE TABLE public.event_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT '📅',
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default categories
INSERT INTO public.event_categories (name, slug, icon, color) VALUES
  ('Party', 'party', '🎉', '#ec4899'),
  ('Business', 'business', '💼', '#3b82f6'),
  ('Sports', 'sports', '⚽', '#22c55e'),
  ('Travel', 'travel', '✈️', '#f59e0b'),
  ('Music', 'music', '🎵', '#8b5cf6'),
  ('Food & Drink', 'food-drink', '🍕', '#ef4444'),
  ('Arts & Culture', 'arts-culture', '🎨', '#06b6d4'),
  ('Education', 'education', '📚', '#6366f1'),
  ('Health & Wellness', 'health-wellness', '🧘', '#10b981'),
  ('Networking', 'networking', '🤝', '#f97316'),
  ('Community', 'community', '👥', '#84cc16'),
  ('Other', 'other', '📅', '#6b7280');

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Public events are viewable by everyone"
  ON public.events FOR SELECT
  USING (
    privacy = 'public' OR 
    creator_id = auth.uid() OR
    EXISTS (SELECT 1 FROM event_rsvps WHERE event_id = events.id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM event_invitations WHERE event_id = events.id AND invitee_id = auth.uid())
  );

CREATE POLICY "Users can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their events"
  ON public.events FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their events"
  ON public.events FOR DELETE
  USING (auth.uid() = creator_id);

-- Event RSVPs policies
CREATE POLICY "Anyone can view RSVPs for accessible events"
  ON public.event_rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_rsvps.event_id 
      AND (events.privacy = 'public' OR events.creator_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM event_rsvps er WHERE er.event_id = events.id AND er.user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can RSVP to events"
  ON public.event_rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their RSVP"
  ON public.event_rsvps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their RSVP"
  ON public.event_rsvps FOR DELETE
  USING (auth.uid() = user_id);

-- Event invitations policies
CREATE POLICY "Users can view their invitations"
  ON public.event_invitations FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "Event creators can send invitations"
  ON public.event_invitations FOR INSERT
  WITH CHECK (
    auth.uid() = inviter_id AND
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND creator_id = auth.uid())
  );

CREATE POLICY "Invitees can update invitation status"
  ON public.event_invitations FOR UPDATE
  USING (auth.uid() = invitee_id);

CREATE POLICY "Inviters can cancel invitations"
  ON public.event_invitations FOR DELETE
  USING (auth.uid() = inviter_id);

-- Event media policies
CREATE POLICY "Anyone can view media for accessible events"
  ON public.event_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_media.event_id 
      AND (events.privacy = 'public' OR events.creator_id = auth.uid())
    )
  );

CREATE POLICY "Attendees can upload media"
  ON public.event_media FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM event_rsvps WHERE event_id = event_media.event_id AND user_id = auth.uid() AND status = 'going')
  );

CREATE POLICY "Users can delete their own media"
  ON public.event_media FOR DELETE
  USING (auth.uid() = user_id);

-- Event comments policies
CREATE POLICY "Anyone can view comments for accessible events"
  ON public.event_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_comments.event_id 
      AND (events.privacy = 'public' OR events.creator_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can comment on events"
  ON public.event_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.event_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.event_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Event categories policies
CREATE POLICY "Anyone can view event categories"
  ON public.event_categories FOR SELECT
  USING (true);

-- Create function to update event counts
CREATE OR REPLACE FUNCTION public.update_event_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE events SET
      going_count = (SELECT COUNT(*) FROM event_rsvps WHERE event_id = NEW.event_id AND status = 'going'),
      interested_count = (SELECT COUNT(*) FROM event_rsvps WHERE event_id = NEW.event_id AND status = 'interested')
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events SET
      going_count = (SELECT COUNT(*) FROM event_rsvps WHERE event_id = OLD.event_id AND status = 'going'),
      interested_count = (SELECT COUNT(*) FROM event_rsvps WHERE event_id = OLD.event_id AND status = 'interested')
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for RSVP count updates
CREATE TRIGGER update_event_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.event_rsvps
FOR EACH ROW EXECUTE FUNCTION public.update_event_counts();

-- Create storage bucket for event media
INSERT INTO storage.buckets (id, name, public) VALUES ('event-media', 'event-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event media
CREATE POLICY "Anyone can view event media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-media');

CREATE POLICY "Authenticated users can upload event media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own event media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-media' AND auth.uid()::text = (storage.foldername(name))[1]);