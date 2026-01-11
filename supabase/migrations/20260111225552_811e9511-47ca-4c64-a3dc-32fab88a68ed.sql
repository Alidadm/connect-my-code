-- Step 1: Add email, phone, birthday columns to profiles_private
ALTER TABLE public.profiles_private
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS birthday DATE;

-- Step 2: Migrate existing sensitive data from profiles to profiles_private
UPDATE public.profiles_private pp
SET 
  email = p.email,
  phone = p.phone,
  birthday = p.birthday
FROM public.profiles p
WHERE pp.user_id = p.user_id;

-- Step 3: Insert records for users who don't have profiles_private entry yet
INSERT INTO public.profiles_private (user_id, email, phone, birthday)
SELECT user_id, email, phone, birthday
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles_private pp WHERE pp.user_id = p.user_id
)
AND (p.email IS NOT NULL OR p.phone IS NOT NULL OR p.birthday IS NOT NULL);

-- Step 4: Drop sensitive columns from profiles table
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS birthday;

-- Step 5: Update SELECT policy to allow authenticated users to view public profile info
-- First drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy allowing authenticated users to view any profile's public fields
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);