-- Add new columns to groups table for enhanced functionality
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS approval_setting text DEFAULT 'anyone' CHECK (approval_setting IN ('anyone', 'admin_only', 'invite_only'));

-- Update privacy check constraint to include new privacy types
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_privacy_check;
ALTER TABLE public.groups ADD CONSTRAINT groups_privacy_check 
  CHECK (privacy IN ('public', 'private_visible', 'private_hidden'));

-- Create group categories table for predefined categories
CREATE TABLE IF NOT EXISTS public.group_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  icon text DEFAULT '📁',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default categories
INSERT INTO public.group_categories (name, icon) VALUES
  ('Business', '💼'),
  ('Family', '👨‍👩‍👧‍👦'),
  ('Hobbies', '🎨'),
  ('Education', '📚'),
  ('Sports', '⚽'),
  ('Technology', '💻'),
  ('Music', '🎵'),
  ('Gaming', '🎮'),
  ('Travel', '✈️'),
  ('Food', '🍕'),
  ('Health', '❤️'),
  ('Other', '📁')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on group_categories
ALTER TABLE public.group_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view categories
CREATE POLICY "Anyone can view group categories"
  ON public.group_categories
  FOR SELECT
  USING (true);

-- Create group invitations table
CREATE TABLE IF NOT EXISTS public.group_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_id, invitee_id)
);

-- Enable RLS on group_invitations
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations they sent or received
CREATE POLICY "Users can view their invitations"
  ON public.group_invitations
  FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- Group admins/creators can send invitations
CREATE POLICY "Group admins can send invitations"
  ON public.group_invitations
  FOR INSERT
  WITH CHECK (
    auth.uid() = inviter_id AND
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id AND (
        g.creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = g.id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator')
        )
      )
    )
  );

-- Invitees can update their invitation status
CREATE POLICY "Invitees can respond to invitations"
  ON public.group_invitations
  FOR UPDATE
  USING (auth.uid() = invitee_id);

-- Inviters can delete pending invitations
CREATE POLICY "Inviters can cancel invitations"
  ON public.group_invitations
  FOR DELETE
  USING (auth.uid() = inviter_id AND status = 'pending');

-- Create join requests table for private groups
CREATE TABLE IF NOT EXISTS public.group_join_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  UNIQUE(group_id, user_id)
);

-- Enable RLS on group_join_requests
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their join requests"
  ON public.group_join_requests
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id AND (
        g.creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = g.id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator')
        )
      )
    )
  );

-- Users can submit join requests
CREATE POLICY "Users can submit join requests"
  ON public.group_join_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Group admins can update request status
CREATE POLICY "Group admins can review requests"
  ON public.group_join_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id AND (
        g.creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = g.id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator')
        )
      )
    )
  );

-- Users can cancel their pending requests
CREATE POLICY "Users can cancel their requests"
  ON public.group_join_requests
  FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Update existing groups to use new privacy values (migrate 'private' to 'private_visible')
UPDATE public.groups SET privacy = 'private_visible' WHERE privacy = 'private';

-- Update RLS policy for groups to handle new privacy types
DROP POLICY IF EXISTS "Public groups are viewable by everyone" ON public.groups;
CREATE POLICY "Groups visibility based on privacy"
  ON public.groups
  FOR SELECT
  USING (
    privacy = 'public' OR
    privacy = 'private_visible' OR
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = id AND gm.user_id = auth.uid()
    )
  );

-- Create storage bucket for group media
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-media', 'group-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for group media
CREATE POLICY "Anyone can view group media"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'group-media');

CREATE POLICY "Authenticated users can upload group media"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'group-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their uploaded group media"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'group-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their uploaded group media"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'group-media' AND auth.uid()::text = (storage.foldername(name))[1]);