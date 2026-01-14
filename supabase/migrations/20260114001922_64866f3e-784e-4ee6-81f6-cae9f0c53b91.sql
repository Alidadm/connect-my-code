-- Create custom_lists table for user-defined friend groups
CREATE TABLE public.custom_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#1c76e6',
  icon TEXT DEFAULT '👥',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for members in custom lists
CREATE TABLE public.custom_list_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.custom_lists(id) ON DELETE CASCADE,
  member_user_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(list_id, member_user_id)
);

-- Create table to track which custom lists can view a post
CREATE TABLE public.post_visibility_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES public.custom_lists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, list_id)
);

-- Enable RLS on all tables
ALTER TABLE public.custom_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_visibility_lists ENABLE ROW LEVEL SECURITY;

-- RLS for custom_lists
CREATE POLICY "Users can view their own lists"
  ON public.custom_lists
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lists"
  ON public.custom_lists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lists"
  ON public.custom_lists
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lists"
  ON public.custom_lists
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for custom_list_members
CREATE POLICY "List owners can view members"
  ON public.custom_list_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_lists
      WHERE id = list_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "List owners can add members"
  ON public.custom_list_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_lists
      WHERE id = list_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "List owners can remove members"
  ON public.custom_list_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_lists
      WHERE id = list_id AND user_id = auth.uid()
    )
  );

-- RLS for post_visibility_lists
CREATE POLICY "Post owners can view visibility lists"
  ON public.post_visibility_lists
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Post owners can add visibility lists"
  ON public.post_visibility_lists
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Post owners can remove visibility lists"
  ON public.post_visibility_lists
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- Add trigger for updated_at on custom_lists
CREATE TRIGGER update_custom_lists_updated_at
  BEFORE UPDATE ON public.custom_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_custom_lists_user_id ON public.custom_lists(user_id);
CREATE INDEX idx_custom_list_members_list_id ON public.custom_list_members(list_id);
CREATE INDEX idx_custom_list_members_member_user_id ON public.custom_list_members(member_user_id);
CREATE INDEX idx_post_visibility_lists_post_id ON public.post_visibility_lists(post_id);
CREATE INDEX idx_post_visibility_lists_list_id ON public.post_visibility_lists(list_id);