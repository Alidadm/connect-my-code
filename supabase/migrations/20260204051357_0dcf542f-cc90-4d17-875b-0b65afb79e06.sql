-- Add admin pricing fields to ad_orders
ALTER TABLE public.ad_orders 
ADD COLUMN IF NOT EXISTS admin_quoted_price numeric,
ADD COLUMN IF NOT EXISTS quote_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS quote_expires_at timestamptz;

-- Update status enum to include new states
-- Current statuses: pending_review, approved, rejected
-- New statuses: pending_review, quoted, approved, rejected, expired

COMMENT ON COLUMN public.ad_orders.admin_quoted_price IS 'Price set by admin after reviewing the ad creative';
COMMENT ON COLUMN public.ad_orders.quote_sent_at IS 'When the quote was sent to the user';
COMMENT ON COLUMN public.ad_orders.quote_expires_at IS 'Quote expiration date';