-- Drop the old check constraint and add a new one with all visibility options
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_visibility_check;

ALTER TABLE public.posts ADD CONSTRAINT posts_visibility_check 
CHECK (visibility IN ('public', 'friends', 'followers', 'private', 'custom'));