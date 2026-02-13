
-- Add scheduled_at column to posts for scheduling support
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficiently querying scheduled posts
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON public.posts (scheduled_at) WHERE scheduled_at IS NOT NULL;
