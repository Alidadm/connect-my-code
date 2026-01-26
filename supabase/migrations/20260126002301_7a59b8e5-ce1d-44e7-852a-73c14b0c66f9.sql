-- Fix RLS policies for viewed_short_videos table
-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own viewed short videos" ON public.viewed_short_videos;
DROP POLICY IF EXISTS "Users can insert their own viewed short videos" ON public.viewed_short_videos;
DROP POLICY IF EXISTS "Users can delete their own viewed short videos" ON public.viewed_short_videos;

-- Create proper RLS policies
CREATE POLICY "Users can view their own viewed short videos"
ON public.viewed_short_videos
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own viewed short videos"
ON public.viewed_short_videos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own viewed short videos"
ON public.viewed_short_videos
FOR DELETE
USING (auth.uid() = user_id);