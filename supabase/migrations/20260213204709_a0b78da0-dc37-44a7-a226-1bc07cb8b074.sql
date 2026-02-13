
-- Create reddit video groups table
CREATE TABLE public.reddit_video_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reddit videos table
CREATE TABLE public.reddit_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.reddit_video_groups(id) ON DELETE CASCADE,
  reddit_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  media_type TEXT DEFAULT 'post',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reddit_video_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reddit_videos ENABLE ROW LEVEL SECURITY;

-- Public read for active groups
CREATE POLICY "Anyone can view active reddit video groups"
  ON public.reddit_video_groups FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can view reddit videos"
  ON public.reddit_videos FOR SELECT
  USING (true);

-- Admin policies using has_role function
CREATE POLICY "Admins can manage reddit video groups"
  ON public.reddit_video_groups FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage reddit videos"
  ON public.reddit_videos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_reddit_video_groups_updated_at
  BEFORE UPDATE ON public.reddit_video_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
