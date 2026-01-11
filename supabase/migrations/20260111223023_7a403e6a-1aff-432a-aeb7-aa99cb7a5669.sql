-- Explicitly set security_invoker on the view to make it clear
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
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