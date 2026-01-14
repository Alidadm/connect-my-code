-- Create table for group comment likes
CREATE TABLE public.group_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.group_post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.group_comment_likes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view likes on comments in groups they are members of
CREATE POLICY "Members can view comment likes"
  ON public.group_comment_likes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_post_comments gpc
      JOIN public.group_posts gp ON gpc.post_id = gp.id
      JOIN public.group_members gm ON gp.group_id = gm.group_id
      WHERE gpc.id = group_comment_likes.comment_id
      AND gm.user_id = auth.uid()
    )
  );

-- Policy: Users can like comments in groups they are members of
CREATE POLICY "Members can like comments"
  ON public.group_comment_likes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.group_post_comments gpc
      JOIN public.group_posts gp ON gpc.post_id = gp.id
      JOIN public.group_members gm ON gp.group_id = gm.group_id
      WHERE gpc.id = group_comment_likes.comment_id
      AND gm.user_id = auth.uid()
    )
  );

-- Policy: Users can unlike their own likes
CREATE POLICY "Users can unlike comments"
  ON public.group_comment_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_group_comment_likes_comment ON public.group_comment_likes(comment_id);
CREATE INDEX idx_group_comment_likes_user ON public.group_comment_likes(user_id);