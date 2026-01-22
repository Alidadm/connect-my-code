-- First, ensure there are no duplicates before adding the constraint
-- (we already cleaned these up, but this is a safety check)
DELETE FROM public.commissions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY referred_user_id ORDER BY created_at ASC) as rn
    FROM public.commissions
  ) t WHERE rn > 1
);

-- Add unique constraint to prevent duplicate commissions for the same referred user
ALTER TABLE public.commissions 
ADD CONSTRAINT unique_referred_user_commission UNIQUE (referred_user_id);