-- Add scheduled_at column for scheduling platform posts
ALTER TABLE public.posts ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient querying of scheduled posts
CREATE INDEX idx_posts_scheduled_at ON public.posts(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Update the RLS policy for viewing platform posts to only show published ones
DROP POLICY IF EXISTS "Anyone can view platform posts" ON public.posts;

CREATE POLICY "Anyone can view platform posts" 
ON public.posts 
FOR SELECT 
USING (
  is_platform_post = true 
  AND (scheduled_at IS NULL OR scheduled_at <= now())
);