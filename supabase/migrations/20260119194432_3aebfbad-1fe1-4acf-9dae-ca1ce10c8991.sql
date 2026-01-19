-- Create table for TikTok-style short videos
CREATE TABLE public.short_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.short_videos ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (all authenticated users can view)
CREATE POLICY "Anyone can view active short videos" 
ON public.short_videos 
FOR SELECT 
USING (is_active = true);

-- Create policy for admin insert
CREATE POLICY "Admins can insert short videos" 
ON public.short_videos 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create policy for admin update
CREATE POLICY "Admins can update short videos" 
ON public.short_videos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create policy for admin delete
CREATE POLICY "Admins can delete short videos" 
ON public.short_videos 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_short_videos_updated_at
BEFORE UPDATE ON public.short_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();