-- Create table for storing legal pages content
CREATE TABLE public.legal_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_type TEXT NOT NULL UNIQUE CHECK (page_type IN ('terms', 'privacy', 'cookies')),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

-- Public can read legal pages
CREATE POLICY "Legal pages are publicly readable"
ON public.legal_pages
FOR SELECT
USING (true);

-- Only admins can update legal pages
CREATE POLICY "Admins can update legal pages"
ON public.legal_pages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Only admins can insert legal pages
CREATE POLICY "Admins can insert legal pages"
ON public.legal_pages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Insert default records
INSERT INTO public.legal_pages (page_type, title, content) VALUES
  ('terms', 'Terms of Service', '<h1>Terms of Service</h1><p>Welcome to our platform. By using our services, you agree to these terms.</p>'),
  ('privacy', 'Privacy Policy', '<h1>Privacy Policy</h1><p>Your privacy is important to us. This policy explains how we collect and use your data.</p>'),
  ('cookies', 'Cookies Policy', '<h1>Cookies Policy</h1><p>We use cookies to improve your experience on our website.</p>');