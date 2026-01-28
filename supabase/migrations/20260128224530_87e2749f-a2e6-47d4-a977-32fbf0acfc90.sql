-- Create template_themes table to store available themes
CREATE TABLE public.template_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  preview_image_url TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.template_themes ENABLE ROW LEVEL SECURITY;

-- Everyone can read themes
CREATE POLICY "Anyone can view active themes"
ON public.template_themes
FOR SELECT
USING (is_active = true);

-- Add selected_theme_id to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS selected_theme_id UUID REFERENCES public.template_themes(id);

-- Insert the Blue theme (current default)
INSERT INTO public.template_themes (name, slug, description, is_default, sort_order)
VALUES ('Blue', 'blue', 'Classic blue theme with a clean, modern look', true, 2);

-- Insert the All Colors theme
INSERT INTO public.template_themes (name, slug, description, sort_order)
VALUES ('All Colors', 'all-colors', 'Vibrant multi-color theme inspired by the admin dashboard with dynamic gradients', 1);