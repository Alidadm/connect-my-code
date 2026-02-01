-- Create table for TikTok video groups (up to 10 videos per group)
CREATE TABLE public.tiktok_video_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Create table for individual TikTok videos within groups
CREATE TABLE public.tiktok_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.tiktok_video_groups(id) ON DELETE CASCADE,
  tiktok_url TEXT NOT NULL,
  tiktok_video_id TEXT,
  thumbnail_url TEXT,
  video_title TEXT,
  author_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tiktok_video_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_videos ENABLE ROW LEVEL SECURITY;

-- RLS policies for tiktok_video_groups
CREATE POLICY "Anyone can view active video groups"
  ON public.tiktok_video_groups
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage video groups"
  ON public.tiktok_video_groups
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for tiktok_videos
CREATE POLICY "Anyone can view videos in active groups"
  ON public.tiktok_videos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tiktok_video_groups
      WHERE id = group_id AND is_active = true
    )
  );

CREATE POLICY "Admins can manage videos"
  ON public.tiktok_videos
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_tiktok_video_groups_updated_at
  BEFORE UPDATE ON public.tiktok_video_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_tiktok_videos_group_id ON public.tiktok_videos(group_id);
CREATE INDEX idx_tiktok_video_groups_active ON public.tiktok_video_groups(is_active, sort_order);