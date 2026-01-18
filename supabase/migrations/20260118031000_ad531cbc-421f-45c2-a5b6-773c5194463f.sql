
-- Create blog categories table
CREATE TABLE public.blog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blogs table
CREATE TABLE public.blogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  cover_image_url TEXT,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  reading_time_minutes INTEGER DEFAULT 1,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- Create blog blocks table for block-based content
CREATE TABLE public.blog_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'heading', 'image', 'quote', 'code', 'divider', 'list', 'embed')),
  content JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blog tags table
CREATE TABLE public.blog_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blog tag mappings
CREATE TABLE public.blog_tag_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blog_id, tag_id)
);

-- Create blog likes table
CREATE TABLE public.blog_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blog_id, user_id)
);

-- Create blog comments table
CREATE TABLE public.blog_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tag_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

-- Blog categories policies (public read, admin write) - correct parameter order
CREATE POLICY "Anyone can view blog categories" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage blog categories" ON public.blog_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Blogs policies
CREATE POLICY "Anyone can view published blogs" ON public.blogs FOR SELECT USING (status = 'published' OR auth.uid() = user_id);
CREATE POLICY "Users can create their own blogs" ON public.blogs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own blogs" ON public.blogs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own blogs" ON public.blogs FOR DELETE USING (auth.uid() = user_id);

-- Blog blocks policies
CREATE POLICY "Anyone can view blocks of published blogs" ON public.blog_blocks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.blogs WHERE blogs.id = blog_blocks.blog_id AND (blogs.status = 'published' OR blogs.user_id = auth.uid()))
);
CREATE POLICY "Users can manage blocks of their own blogs" ON public.blog_blocks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.blogs WHERE blogs.id = blog_blocks.blog_id AND blogs.user_id = auth.uid())
);
CREATE POLICY "Users can update blocks of their own blogs" ON public.blog_blocks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.blogs WHERE blogs.id = blog_blocks.blog_id AND blogs.user_id = auth.uid())
);
CREATE POLICY "Users can delete blocks of their own blogs" ON public.blog_blocks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.blogs WHERE blogs.id = blog_blocks.blog_id AND blogs.user_id = auth.uid())
);

-- Blog tags policies (public read, authenticated create)
CREATE POLICY "Anyone can view blog tags" ON public.blog_tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tags" ON public.blog_tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Blog tag mappings policies
CREATE POLICY "Anyone can view tag mappings" ON public.blog_tag_mappings FOR SELECT USING (true);
CREATE POLICY "Users can manage tag mappings for their blogs" ON public.blog_tag_mappings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.blogs WHERE blogs.id = blog_tag_mappings.blog_id AND blogs.user_id = auth.uid())
);
CREATE POLICY "Users can delete tag mappings for their blogs" ON public.blog_tag_mappings FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.blogs WHERE blogs.id = blog_tag_mappings.blog_id AND blogs.user_id = auth.uid())
);

-- Blog likes policies
CREATE POLICY "Anyone can view blog likes" ON public.blog_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like blogs" ON public.blog_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own likes" ON public.blog_likes FOR DELETE USING (auth.uid() = user_id);

-- Blog comments policies
CREATE POLICY "Anyone can view blog comments" ON public.blog_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.blog_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.blog_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.blog_comments FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_blogs_user_id ON public.blogs(user_id);
CREATE INDEX idx_blogs_status ON public.blogs(status);
CREATE INDEX idx_blogs_category_id ON public.blogs(category_id);
CREATE INDEX idx_blogs_published_at ON public.blogs(published_at DESC);
CREATE INDEX idx_blog_blocks_blog_id ON public.blog_blocks(blog_id);
CREATE INDEX idx_blog_blocks_order ON public.blog_blocks(blog_id, order_index);
CREATE INDEX idx_blog_likes_blog_id ON public.blog_likes(blog_id);
CREATE INDEX idx_blog_comments_blog_id ON public.blog_comments(blog_id);

-- Insert default categories
INSERT INTO public.blog_categories (name, slug, description, icon, color) VALUES
  ('Technology', 'technology', 'Tech news, tutorials, and innovations', 'Cpu', '#3B82F6'),
  ('Lifestyle', 'lifestyle', 'Daily life, wellness, and personal growth', 'Heart', '#EC4899'),
  ('Travel', 'travel', 'Adventures, destinations, and travel tips', 'Plane', '#10B981'),
  ('Food', 'food', 'Recipes, restaurants, and culinary experiences', 'UtensilsCrossed', '#F59E0B'),
  ('Business', 'business', 'Entrepreneurship, finance, and career', 'Briefcase', '#8B5CF6'),
  ('Entertainment', 'entertainment', 'Movies, music, games, and pop culture', 'Film', '#EF4444'),
  ('Sports', 'sports', 'Sports news, fitness, and athletics', 'Trophy', '#06B6D4'),
  ('Education', 'education', 'Learning, courses, and knowledge sharing', 'GraduationCap', '#84CC16');

-- Create trigger for updated_at
CREATE TRIGGER update_blogs_updated_at BEFORE UPDATE ON public.blogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_blocks_updated_at BEFORE UPDATE ON public.blog_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_comments_updated_at BEFORE UPDATE ON public.blog_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
