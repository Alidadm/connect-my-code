-- Create a secure view for profile access that hides sensitive fields from non-owners
-- Owners see all their data, others see only public social profile info

CREATE OR REPLACE VIEW public.safe_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  username,
  display_name,
  avatar_url,
  cover_url,
  bio,
  location,
  country,
  first_name,
  last_name,
  is_verified,
  created_at,
  updated_at,
  -- Sensitive fields only visible to the profile owner
  CASE WHEN auth.uid() = user_id THEN referral_code ELSE NULL END AS referral_code,
  CASE WHEN auth.uid() = user_id THEN subscription_status ELSE NULL END AS subscription_status,
  CASE WHEN auth.uid() = user_id THEN phone_verified ELSE NULL END AS phone_verified,
  CASE WHEN auth.uid() = user_id THEN email_verified ELSE NULL END AS email_verified,
  CASE WHEN auth.uid() = user_id THEN referrer_id ELSE NULL END AS referrer_id,
  CASE WHEN auth.uid() = user_id THEN username_changed ELSE NULL END AS username_changed
FROM public.profiles
WHERE auth.uid() IS NOT NULL;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.safe_profiles IS 'Secure view that exposes public profile data to authenticated users while hiding sensitive fields (referral_code, subscription_status, verification flags) from non-owners';

-- Update the profiles table RLS to only allow owner access directly
-- Others should use the safe_profiles view
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create policy that only allows viewing own profile directly
CREATE POLICY "Users can only view their own profile directly"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);