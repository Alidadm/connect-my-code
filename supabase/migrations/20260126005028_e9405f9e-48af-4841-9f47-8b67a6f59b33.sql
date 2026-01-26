
-- Drop existing INSERT policy and recreate it correctly
DROP POLICY IF EXISTS "Users can insert their own viewed short videos" ON public.viewed_short_videos;

-- Create corrected INSERT policy with proper WITH CHECK clause
CREATE POLICY "Users can insert their own viewed short videos"
ON public.viewed_short_videos
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);
