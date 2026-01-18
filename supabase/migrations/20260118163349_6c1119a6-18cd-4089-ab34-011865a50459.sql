-- Fix safe_profiles visibility: run view with definer privileges so it can bypass RLS on profiles
-- (profiles table is restricted to owner-only SELECT; safe_profiles is intended for public/non-sensitive profile access)
ALTER VIEW public.safe_profiles SET (security_invoker = false);

-- Ensure authenticated users can read safe profile data
GRANT SELECT ON public.safe_profiles TO authenticated;

-- (Optional) allow unauthenticated visitors to read safe profiles if needed by public pages
-- GRANT SELECT ON public.safe_profiles TO anon;