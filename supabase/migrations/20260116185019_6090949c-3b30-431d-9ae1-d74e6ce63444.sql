-- Create table to queue commission notifications for daily digest
CREATE TABLE public.pending_commission_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('commission_earned', 'payout_completed')),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  referred_user_name TEXT,
  payout_method TEXT,
  payment_provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  batch_id UUID
);

-- Enable RLS
ALTER TABLE public.pending_commission_notifications ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (no client access)
CREATE POLICY "Service role only" 
ON public.pending_commission_notifications 
FOR ALL 
USING (false);

-- Index for efficient batch processing
CREATE INDEX idx_pending_notifications_unsent 
ON public.pending_commission_notifications (referrer_id, notification_type) 
WHERE sent_at IS NULL;

-- Add comment
COMMENT ON TABLE public.pending_commission_notifications IS 'Queues commission notifications for daily digest emails instead of sending immediately';