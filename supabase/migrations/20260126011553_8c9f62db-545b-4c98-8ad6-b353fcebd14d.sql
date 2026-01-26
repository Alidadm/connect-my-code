-- Restore viewed_youtube_videos table for regular YouTube video tracking
CREATE TABLE IF NOT EXISTS public.viewed_youtube_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id text NOT NULL,
  viewed_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE public.viewed_youtube_videos ENABLE ROW LEVEL SECURITY;

-- Create policies for viewed_youtube_videos
CREATE POLICY "Users can view their own watched videos"
  ON public.viewed_youtube_videos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watched videos"
  ON public.viewed_youtube_videos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watched videos"
  ON public.viewed_youtube_videos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);