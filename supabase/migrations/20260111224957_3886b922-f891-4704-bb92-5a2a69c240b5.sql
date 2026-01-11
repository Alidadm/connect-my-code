-- Drop existing permissive policies on phone_verification_codes
DROP POLICY IF EXISTS "Users can view their verification codes" ON public.phone_verification_codes;
DROP POLICY IF EXISTS "Users can create verification codes" ON public.phone_verification_codes;
DROP POLICY IF EXISTS "Users can update their verification codes" ON public.phone_verification_codes;

-- Add explicit DENY-ALL policies - only service role can access
-- This prevents any client-side access to verification codes

CREATE POLICY "No client access to verification codes"
ON public.phone_verification_codes
FOR SELECT
USING (false);

CREATE POLICY "No client insert verification codes"
ON public.phone_verification_codes
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No client update verification codes"
ON public.phone_verification_codes
FOR UPDATE
USING (false);

CREATE POLICY "No client delete verification codes"
ON public.phone_verification_codes
FOR DELETE
USING (false);