-- Create polls table
CREATE TABLE public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll_votes table with unique constraint per user per poll
CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_option INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Enable RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls policies
CREATE POLICY "Anyone can view active polls"
ON public.polls FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage polls"
ON public.polls FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Poll votes policies
CREATE POLICY "Users can view all votes for counting"
ON public.poll_votes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can vote once per poll"
ON public.poll_votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_polls_active ON public.polls(is_active, created_at DESC);
CREATE INDEX idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user_id ON public.poll_votes(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_polls_updated_at
BEFORE UPDATE ON public.polls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();