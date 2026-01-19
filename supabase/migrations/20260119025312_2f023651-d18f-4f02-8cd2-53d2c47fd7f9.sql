-- Add is_platform_post column to posts table for admin/platform-wide posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_platform_post boolean DEFAULT false;

-- Create index for efficient querying of platform posts
CREATE INDEX IF NOT EXISTS idx_posts_is_platform_post ON public.posts(is_platform_post) WHERE is_platform_post = true;

-- Update RLS policies to allow all authenticated users to view platform posts
-- First drop existing policy if it exists
DROP POLICY IF EXISTS "Platform posts are viewable by all authenticated users" ON public.posts;

-- Create policy for platform posts visibility (all authenticated users can see platform posts)
CREATE POLICY "Platform posts are viewable by all authenticated users"
ON public.posts
FOR SELECT
USING (is_platform_post = true AND auth.uid() IS NOT NULL);

-- Allow admins to create platform posts
DROP POLICY IF EXISTS "Admins can create platform posts" ON public.posts;
CREATE POLICY "Admins can create platform posts"
ON public.posts
FOR INSERT
WITH CHECK (
  is_platform_post = true AND 
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to update platform posts
DROP POLICY IF EXISTS "Admins can update platform posts" ON public.posts;
CREATE POLICY "Admins can update platform posts"
ON public.posts
FOR UPDATE
USING (
  is_platform_post = true AND 
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to delete platform posts
DROP POLICY IF EXISTS "Admins can delete platform posts" ON public.posts;
CREATE POLICY "Admins can delete platform posts"
ON public.posts
FOR DELETE
USING (
  is_platform_post = true AND 
  public.has_role(auth.uid(), 'admin'::public.app_role)
);