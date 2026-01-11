-- Add explicit restrictive RLS policies to profiles_private
-- These ensure NO user access even if RLS is somehow misconfigured
-- Service role always bypasses RLS, so backend functions still work

-- Policy that explicitly denies all SELECT for regular users
CREATE POLICY "No user access to private profiles"
ON public.profiles_private
FOR SELECT
USING (false);

-- Policy that explicitly denies all INSERT for regular users
CREATE POLICY "No user insert to private profiles"
ON public.profiles_private
FOR INSERT
WITH CHECK (false);

-- Policy that explicitly denies all UPDATE for regular users
CREATE POLICY "No user update to private profiles"
ON public.profiles_private
FOR UPDATE
USING (false);

-- Policy that explicitly denies all DELETE for regular users
CREATE POLICY "No user delete to private profiles"
ON public.profiles_private
FOR DELETE
USING (false);