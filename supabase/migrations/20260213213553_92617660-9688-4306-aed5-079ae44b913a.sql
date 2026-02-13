
-- Make group_id nullable so reddit videos can exist without a group
ALTER TABLE public.reddit_videos ALTER COLUMN group_id DROP NOT NULL;

-- Add is_active column for toggling visibility
ALTER TABLE public.reddit_videos ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Drop the old reddit_video_groups table if it exists
DROP TABLE IF EXISTS public.reddit_video_groups CASCADE;

-- Drop old RLS policies and recreate clean ones
DROP POLICY IF EXISTS "Anyone can view reddit videos" ON public.reddit_videos;
DROP POLICY IF EXISTS "Admins can manage reddit videos" ON public.reddit_videos;
DROP POLICY IF EXISTS "Anyone can view active reddit videos" ON public.reddit_videos;
DROP POLICY IF EXISTS "Admins can insert reddit videos" ON public.reddit_videos;
DROP POLICY IF EXISTS "Admins can update reddit videos" ON public.reddit_videos;
DROP POLICY IF EXISTS "Admins can delete reddit videos" ON public.reddit_videos;

-- Enable RLS
ALTER TABLE public.reddit_videos ENABLE ROW LEVEL SECURITY;

-- Anyone can read active videos
CREATE POLICY "Anyone can view active reddit videos"
  ON public.reddit_videos FOR SELECT
  USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage reddit videos"
  ON public.reddit_videos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
