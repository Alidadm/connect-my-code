-- Add explicit DENY policies for INSERT/UPDATE/DELETE on commissions
-- Only service role (edge functions) should create/modify commissions

-- Explicit deny for INSERT - only service role can create commissions
CREATE POLICY "No client insert commissions"
ON public.commissions
FOR INSERT
WITH CHECK (false);

-- Explicit deny for UPDATE - only service role can update commissions  
CREATE POLICY "No client update commissions"
ON public.commissions
FOR UPDATE
USING (false);

-- Explicit deny for DELETE - commissions should never be deleted
CREATE POLICY "No client delete commissions"
ON public.commissions
FOR DELETE
USING (false);