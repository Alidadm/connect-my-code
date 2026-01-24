-- Create table to track viewed short videos (admin-uploaded) by users
CREATE TABLE IF NOT EXISTS public.viewed_short_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  short_video_id UUID NOT NULL REFERENCES public.short_videos(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT viewed_short_videos_unique UNIQUE (user_id, short_video_id)
);

-- Enable RLS
ALTER TABLE public.viewed_short_videos ENABLE ROW LEVEL SECURITY;

-- Users can view their own viewed videos
CREATE POLICY "Users can view their own viewed short videos"
ON public.viewed_short_videos
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own viewed videos
CREATE POLICY "Users can insert their own viewed short videos"
ON public.viewed_short_videos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX idx_viewed_short_videos_user_id ON public.viewed_short_videos(user_id);
CREATE INDEX idx_viewed_short_videos_video_id ON public.viewed_short_videos(short_video_id);