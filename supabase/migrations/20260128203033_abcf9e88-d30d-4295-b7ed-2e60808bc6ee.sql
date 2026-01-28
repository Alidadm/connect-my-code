-- Create SEO settings table for managing SEO keywords and metadata
CREATE TABLE public.seo_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  robots TEXT DEFAULT 'index, follow',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage SEO settings
CREATE POLICY "Admins can manage SEO settings"
ON public.seo_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can read SEO settings (needed for frontend to apply meta tags)
CREATE POLICY "Anyone can read SEO settings"
ON public.seo_settings
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_seo_settings_updated_at
BEFORE UPDATE ON public.seo_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default global SEO settings
INSERT INTO public.seo_settings (page_path, title, description, keywords)
VALUES ('/', 'Home', 'Welcome to our platform', ARRAY['social', 'network', 'community']);