-- Create table to track viewed YouTube videos per user
CREATE TABLE public.viewed_youtube_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE public.viewed_youtube_videos ENABLE ROW LEVEL SECURITY;

-- Users can view their own watched videos
CREATE POLICY "Users can view their own watched videos"
ON public.viewed_youtube_videos
FOR SELECT
USING (auth.uid() = user_id);

-- Users can mark videos as watched
CREATE POLICY "Users can mark videos as watched"
ON public.viewed_youtube_videos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their watch history
CREATE POLICY "Users can delete their watch history"
ON public.viewed_youtube_videos
FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_viewed_youtube_videos_user_id ON public.viewed_youtube_videos(user_id);
CREATE INDEX idx_viewed_youtube_videos_video_id ON public.viewed_youtube_videos(video_id);