-- Add is_pinned column to group_posts table
ALTER TABLE public.group_posts ADD COLUMN is_pinned boolean DEFAULT false;

-- Add pinned_at timestamp to track when post was pinned (for ordering multiple pinned posts)
ALTER TABLE public.group_posts ADD COLUMN pinned_at timestamp with time zone;

-- Create index for efficient querying of pinned posts
CREATE INDEX idx_group_posts_pinned ON public.group_posts (group_id, is_pinned, pinned_at DESC NULLS LAST);