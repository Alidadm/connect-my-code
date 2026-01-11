-- Remove the friend profiles policy since it exposes sensitive data
-- Friends should use the public_profiles view instead
DROP POLICY IF EXISTS "Users can view friend profiles" ON public.profiles;

-- Keep only the self-view policy for the profiles table
-- The public_profiles view will be used for viewing friend data

-- Grant authenticated users access to query the public_profiles view
-- The view automatically filters via RLS on the underlying profiles table
-- So friends can query public_profiles to get limited friend data

-- Create a policy that allows viewing public_profiles data for friends
-- Since the view queries profiles, and profiles RLS is "own user only",
-- we need to add a policy to profiles that returns limited data for friends

-- Actually, views bypass RLS on the underlying table when accessed.
-- So we need a different approach: use a function that returns limited data

-- Drop the public_profiles view
DROP VIEW IF EXISTS public.public_profiles;

-- Create a SECURITY INVOKER function that returns limited profile data for friends
CREATE OR REPLACE FUNCTION public.get_friend_profile(friend_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  cover_url text,
  bio text,
  location text,
  is_verified boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
STABLE
AS $$
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.cover_url,
    p.bio,
    p.location,
    p.is_verified,
    p.created_at
  FROM profiles p
  WHERE p.user_id = friend_user_id
  AND (
    -- User can always see their own profile
    auth.uid() = friend_user_id
    -- Or they are friends
    OR public.are_friends(auth.uid(), friend_user_id)
  );
$$;

-- Create a function to get multiple friend profiles at once
CREATE OR REPLACE FUNCTION public.get_friend_profiles(friend_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  cover_url text,
  bio text,
  location text,
  is_verified boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
STABLE
AS $$
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.cover_url,
    p.bio,
    p.location,
    p.is_verified,
    p.created_at
  FROM profiles p
  WHERE p.user_id = ANY(friend_user_ids)
  AND (
    auth.uid() = p.user_id
    OR public.are_friends(auth.uid(), p.user_id)
  );
$$;