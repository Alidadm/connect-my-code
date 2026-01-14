-- Add parent_comment_id to group_post_comments for nested replies
ALTER TABLE public.group_post_comments
ADD COLUMN parent_comment_id UUID REFERENCES public.group_post_comments(id) ON DELETE CASCADE;

-- Add index for faster reply lookups
CREATE INDEX idx_group_post_comments_parent ON public.group_post_comments(parent_comment_id);