-- Add wall_user_id column for posts made on someone else's wall/profile
ALTER TABLE public.posts 
ADD COLUMN wall_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for efficient queries
CREATE INDEX idx_posts_wall_user_id ON public.posts(wall_user_id) WHERE wall_user_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.posts.wall_user_id IS 'The user whose wall/profile this post appears on. NULL means it appears on the author own feed.';