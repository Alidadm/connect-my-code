-- Recreate safe_profiles view to allow both authenticated and unauthenticated access to public profile data
-- Sensitive fields (referral_code, subscription_status, phone_verified, email_verified, referrer_id, username_changed) 
-- are only visible to the profile owner

CREATE OR REPLACE VIEW public.safe_profiles 
WITH (security_invoker = false) 
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
    CASE
        WHEN auth.uid() = user_id THEN referral_code
        ELSE NULL::text
    END AS referral_code,
    CASE
        WHEN auth.uid() = user_id THEN subscription_status
        ELSE NULL::text
    END AS subscription_status,
    CASE
        WHEN auth.uid() = user_id THEN phone_verified
        ELSE NULL::boolean
    END AS phone_verified,
    CASE
        WHEN auth.uid() = user_id THEN email_verified
        ELSE NULL::boolean
    END AS email_verified,
    CASE
        WHEN auth.uid() = user_id THEN referrer_id
        ELSE NULL::uuid
    END AS referrer_id,
    CASE
        WHEN auth.uid() = user_id THEN username_changed
        ELSE NULL::boolean
    END AS username_changed
FROM profiles;

-- Grant access to both authenticated and anon users
GRANT SELECT ON public.safe_profiles TO authenticated;
GRANT SELECT ON public.safe_profiles TO anon;