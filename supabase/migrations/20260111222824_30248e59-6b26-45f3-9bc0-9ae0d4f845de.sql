-- Drop the security definer view and recreate as a regular view
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate as a simple view (no SECURITY DEFINER - inherits caller's permissions)
CREATE VIEW public.public_profiles AS
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