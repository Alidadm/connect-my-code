-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  avatar_url TEXT,
  privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'private', 'secret')),
  creator_id UUID NOT NULL,
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create pages table (for business/creator pages)
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  description TEXT,
  category TEXT,
  cover_url TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL,
  follower_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create page_followers table
CREATE TABLE public.page_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_id, user_id)
);

-- Create topics/interests table
CREATE TABLE public.topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  post_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  is_trending BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_interests table (users following topics)
CREATE TABLE public.user_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

-- Create post_tags table (for tagging friends, groups, pages in posts)
CREATE TABLE public.post_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tagged_user_id UUID,
  tagged_group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  tagged_page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT at_least_one_tag CHECK (
    tagged_user_id IS NOT NULL OR 
    tagged_group_id IS NOT NULL OR 
    tagged_page_id IS NOT NULL
  )
);

-- Create post_topics table (topics/interests associated with posts)
CREATE TABLE public.post_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, topic_id)
);

-- Enable RLS on all tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_topics ENABLE ROW LEVEL SECURITY;

-- Groups policies
CREATE POLICY "Public groups are viewable by everyone" ON public.groups FOR SELECT USING (privacy = 'public' OR creator_id = auth.uid());
CREATE POLICY "Users can create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their groups" ON public.groups FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their groups" ON public.groups FOR DELETE USING (auth.uid() = creator_id);

-- Group members policies
CREATE POLICY "Members can view group membership" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE USING (auth.uid() = user_id);

-- Pages policies
CREATE POLICY "Pages are viewable by everyone" ON public.pages FOR SELECT USING (true);
CREATE POLICY "Users can create pages" ON public.pages FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their pages" ON public.pages FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their pages" ON public.pages FOR DELETE USING (auth.uid() = owner_id);

-- Page followers policies
CREATE POLICY "Anyone can view page followers" ON public.page_followers FOR SELECT USING (true);
CREATE POLICY "Users can follow pages" ON public.page_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unfollow pages" ON public.page_followers FOR DELETE USING (auth.uid() = user_id);

-- Topics policies (viewable by all, managed by admins via user_roles check)
CREATE POLICY "Topics are viewable by everyone" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Admins can insert topics" ON public.topics FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update topics" ON public.topics FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete topics" ON public.topics FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- User interests policies
CREATE POLICY "Anyone can view interests" ON public.user_interests FOR SELECT USING (true);
CREATE POLICY "Users can manage their interests" ON public.user_interests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their interests" ON public.user_interests FOR DELETE USING (auth.uid() = user_id);

-- Post tags policies
CREATE POLICY "Post tags are viewable by everyone" ON public.post_tags FOR SELECT USING (true);
CREATE POLICY "Post authors can add tags" ON public.post_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);
CREATE POLICY "Post authors can remove tags" ON public.post_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);

-- Post topics policies
CREATE POLICY "Post topics are viewable by everyone" ON public.post_topics FOR SELECT USING (true);
CREATE POLICY "Post authors can add topics" ON public.post_topics FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);
CREATE POLICY "Post authors can remove topics" ON public.post_topics FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);

-- Insert some default topics
INSERT INTO public.topics (name, slug, icon, color, is_trending) VALUES
  ('Technology', 'technology', '💻', '#3b82f6', true),
  ('Sports', 'sports', '⚽', '#22c55e', true),
  ('Music', 'music', '🎵', '#8b5cf6', true),
  ('Gaming', 'gaming', '🎮', '#ef4444', true),
  ('Travel', 'travel', '✈️', '#f59e0b', true),
  ('Food', 'food', '🍕', '#ec4899', true),
  ('Fashion', 'fashion', '👗', '#06b6d4', false),
  ('Art', 'art', '🎨', '#a855f7', false),
  ('Fitness', 'fitness', '💪', '#10b981', true),
  ('Business', 'business', '💼', '#6366f1', false),
  ('Photography', 'photography', '📸', '#14b8a6', false),
  ('Movies', 'movies', '🎬', '#f43f5e', true),
  ('Nature', 'nature', '🌿', '#84cc16', false),
  ('Science', 'science', '🔬', '#0ea5e9', false),
  ('Books', 'books', '📚', '#d946ef', false);

-- Create indexes for better performance
CREATE INDEX idx_groups_creator ON public.groups(creator_id);
CREATE INDEX idx_groups_privacy ON public.groups(privacy);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_pages_owner ON public.pages(owner_id);
CREATE INDEX idx_page_followers_page ON public.page_followers(page_id);
CREATE INDEX idx_page_followers_user ON public.page_followers(user_id);
CREATE INDEX idx_post_tags_post ON public.post_tags(post_id);
CREATE INDEX idx_post_tags_user ON public.post_tags(tagged_user_id);
CREATE INDEX idx_post_topics_post ON public.post_topics(post_id);
CREATE INDEX idx_post_topics_topic ON public.post_topics(topic_id);
CREATE INDEX idx_user_interests_user ON public.user_interests(user_id);
CREATE INDEX idx_topics_trending ON public.topics(is_trending) WHERE is_trending = true;