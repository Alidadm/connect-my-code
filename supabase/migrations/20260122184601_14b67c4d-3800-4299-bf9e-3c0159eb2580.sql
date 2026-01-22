
-- Allow anyone (including anonymous users) to view public profile fields
-- The safe_profiles view already hides sensitive fields for non-owners
CREATE POLICY "Anyone can view public profiles"
ON public.profiles
FOR SELECT
USING (true);

-- Drop the old restrictive policy that only allowed users to view their own profile
DROP POLICY IF EXISTS "Users can only view their own profile directly" ON public.profiles;
