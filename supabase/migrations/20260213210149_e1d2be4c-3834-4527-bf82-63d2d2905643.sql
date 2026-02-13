-- Table for users to save individual Reddit links from admin-curated groups
CREATE TABLE public.saved_reddit_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reddit_video_id UUID REFERENCES public.reddit_videos(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, reddit_video_id)
);

-- Enable RLS
ALTER TABLE public.saved_reddit_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved items
CREATE POLICY "Users can view own saved reddit items"
  ON public.saved_reddit_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can save items
CREATE POLICY "Users can save reddit items"
  ON public.saved_reddit_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove saved items
CREATE POLICY "Users can delete own saved reddit items"
  ON public.saved_reddit_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
