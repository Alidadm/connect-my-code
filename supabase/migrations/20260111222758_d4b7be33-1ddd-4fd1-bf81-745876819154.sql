-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = user_a AND addressee_id = user_b)
      OR (requester_id = user_b AND addressee_id = user_a)
    )
  );
$$;

-- Policy: Users can always view their own full profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can view limited info of accepted friends
-- This allows SELECT but the application should only query non-sensitive fields for friends
CREATE POLICY "Users can view friend profiles"
ON public.profiles
FOR SELECT
USING (
  public.are_friends(auth.uid(), user_id)
);

-- Create a secure view for public profile data (non-sensitive fields only)
-- This can be used when displaying friend profiles
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  user_id,
  username,
  display_name,
  avatar_url,
  cover_url,
  bio,
  location,
  is_verified,
  created_at
FROM public.profiles;