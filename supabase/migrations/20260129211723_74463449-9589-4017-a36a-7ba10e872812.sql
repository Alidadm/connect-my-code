-- Create platform photos table for admin-managed gallery
CREATE TABLE public.platform_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.platform_photos ENABLE ROW LEVEL SECURITY;

-- Everyone can view active photos
CREATE POLICY "Anyone can view active platform photos"
ON public.platform_photos
FOR SELECT
USING (is_active = true);

-- Only admins can manage photos using has_role function
CREATE POLICY "Admins can insert platform photos"
ON public.platform_photos
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update platform photos"
ON public.platform_photos
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete platform photos"
ON public.platform_photos
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create saved platform photos table for members
CREATE TABLE public.saved_platform_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.platform_photos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, photo_id)
);

-- Enable RLS
ALTER TABLE public.saved_platform_photos ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved photos
CREATE POLICY "Users can view their own saved platform photos"
ON public.saved_platform_photos
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can save photos
CREATE POLICY "Users can save platform photos"
ON public.saved_platform_photos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can unsave photos
CREATE POLICY "Users can unsave platform photos"
ON public.saved_platform_photos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_platform_photos_updated_at
BEFORE UPDATE ON public.platform_photos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();