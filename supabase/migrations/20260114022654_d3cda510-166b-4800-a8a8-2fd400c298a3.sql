-- Create group_announcements table
CREATE TABLE public.group_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.group_announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active announcements for groups they can see
CREATE POLICY "Anyone can view active announcements"
ON public.group_announcements
FOR SELECT
USING (is_active = true);

-- Policy: Group admins and moderators can manage announcements
CREATE POLICY "Admins can insert announcements"
ON public.group_announcements
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_announcements.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins can update announcements"
ON public.group_announcements
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_announcements.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins can delete announcements"
ON public.group_announcements
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_announcements.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.role IN ('admin', 'moderator')
  )
);

-- Create index for efficient queries
CREATE INDEX idx_group_announcements_group ON public.group_announcements (group_id, is_active, created_at DESC);