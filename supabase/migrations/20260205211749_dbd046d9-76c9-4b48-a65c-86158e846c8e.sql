-- Create sent_emails table to track de-duplication
CREATE TABLE public.sent_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_type TEXT NOT NULL,
  identifier TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_email_per_identifier UNIQUE (email_type, identifier)
);

-- Enable RLS
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (no user-level policies needed)
CREATE POLICY "Service role can manage sent_emails" ON public.sent_emails
  FOR ALL USING (true) WITH CHECK (true);

-- Add index for fast lookups
CREATE INDEX idx_sent_emails_lookup ON public.sent_emails (email_type, identifier);

-- Cleanup old entries after 30 days (optional cron)
COMMENT ON TABLE public.sent_emails IS 'Tracks sent transactional emails to prevent duplicates from webhook retries';