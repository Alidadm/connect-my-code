-- Create business_categories table for predefined categories
CREATE TABLE public.business_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create businesses table for member business profiles
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.business_categories(id),
  custom_category TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website_url TEXT,
  cover_url TEXT,
  business_card_url TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Categories are readable by everyone
CREATE POLICY "Anyone can view business categories"
ON public.business_categories
FOR SELECT
USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage business categories"
ON public.business_categories
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can view all enabled businesses
CREATE POLICY "Anyone can view enabled businesses"
ON public.businesses
FOR SELECT
USING (is_enabled = true OR auth.uid() = user_id);

-- Users can create their own business
CREATE POLICY "Users can create their own business"
ON public.businesses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own business
CREATE POLICY "Users can update their own business"
ON public.businesses
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own business
CREATE POLICY "Users can delete their own business"
ON public.businesses
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_businesses_updated_at
BEFORE UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default business categories
INSERT INTO public.business_categories (name, icon) VALUES
  ('Restaurant & Food', 'UtensilsCrossed'),
  ('Retail & Shopping', 'ShoppingBag'),
  ('Health & Wellness', 'Heart'),
  ('Professional Services', 'Briefcase'),
  ('Technology', 'Laptop'),
  ('Beauty & Spa', 'Sparkles'),
  ('Automotive', 'Car'),
  ('Real Estate', 'Home'),
  ('Education', 'GraduationCap'),
  ('Entertainment', 'Music'),
  ('Finance & Banking', 'Landmark'),
  ('Other', 'Building2');

-- Create storage bucket for business media
INSERT INTO storage.buckets (id, name, public) VALUES ('business-media', 'business-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for business media
CREATE POLICY "Users can upload their own business media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'business-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own business media"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'business-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own business media"
ON storage.objects
FOR DELETE
USING (bucket_id = 'business-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view business media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'business-media');