-- Create group_posts table for storing posts specific to groups
CREATE TABLE public.group_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT,
  media_urls TEXT[] DEFAULT '{}',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_group_posts_group_id ON public.group_posts(group_id);
CREATE INDEX idx_group_posts_user_id ON public.group_posts(user_id);
CREATE INDEX idx_group_posts_created_at ON public.group_posts(created_at DESC);

-- Enable RLS
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view posts in groups they belong to
CREATE POLICY "Group members can view group posts"
ON public.group_posts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_posts.group_id
    AND group_members.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.groups
    WHERE groups.id = group_posts.group_id
    AND groups.privacy = 'public'
  )
);

-- Policy: Members can create posts in groups they belong to
CREATE POLICY "Group members can create posts"
ON public.group_posts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_posts.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Policy: Users can update their own posts
CREATE POLICY "Users can update their own group posts"
ON public.group_posts
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own posts, admins/mods can delete any post
CREATE POLICY "Users and admins can delete group posts"
ON public.group_posts
FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_posts.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.role IN ('admin', 'moderator')
  )
);

-- Create group_post_likes table
CREATE TABLE public.group_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS for likes
ALTER TABLE public.group_post_likes ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view likes on posts they can see
CREATE POLICY "Users can view group post likes"
ON public.group_post_likes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_posts
    JOIN public.group_members ON group_members.group_id = group_posts.group_id
    WHERE group_posts.id = group_post_likes.post_id
    AND group_members.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.group_posts
    JOIN public.groups ON groups.id = group_posts.group_id
    WHERE group_posts.id = group_post_likes.post_id
    AND groups.privacy = 'public'
  )
);

-- Policy: Authenticated users can like posts in groups they can access
CREATE POLICY "Users can like group posts"
ON public.group_post_likes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.group_posts
    JOIN public.group_members ON group_members.group_id = group_posts.group_id
    WHERE group_posts.id = group_post_likes.post_id
    AND group_members.user_id = auth.uid()
  )
);

-- Policy: Users can remove their own likes
CREATE POLICY "Users can unlike group posts"
ON public.group_post_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create group_post_comments table
CREATE TABLE public.group_post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for comments
ALTER TABLE public.group_post_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view comments on posts they can see
CREATE POLICY "Users can view group post comments"
ON public.group_post_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_posts
    JOIN public.group_members ON group_members.group_id = group_posts.group_id
    WHERE group_posts.id = group_post_comments.post_id
    AND group_members.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.group_posts
    JOIN public.groups ON groups.id = group_posts.group_id
    WHERE group_posts.id = group_post_comments.post_id
    AND groups.privacy = 'public'
  )
);

-- Policy: Members can comment on posts in their groups
CREATE POLICY "Members can comment on group posts"
ON public.group_post_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.group_posts
    JOIN public.group_members ON group_members.group_id = group_posts.group_id
    WHERE group_posts.id = group_post_comments.post_id
    AND group_members.user_id = auth.uid()
  )
);

-- Policy: Users can update their own comments
CREATE POLICY "Users can update their own comments"
ON public.group_post_comments
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users and admins can delete comments
CREATE POLICY "Users and admins can delete group comments"
ON public.group_post_comments
FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.group_posts
    JOIN public.group_members ON group_members.group_id = group_posts.group_id
    WHERE group_posts.id = group_post_comments.post_id
    AND group_members.user_id = auth.uid()
    AND group_members.role IN ('admin', 'moderator')
  )
);

-- Add trigger for updated_at on group_posts
CREATE TRIGGER update_group_posts_updated_at
BEFORE UPDATE ON public.group_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on group_post_comments
CREATE TRIGGER update_group_post_comments_updated_at
BEFORE UPDATE ON public.group_post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();