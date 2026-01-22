-- Create table for post reports
CREATE TABLE public.post_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_reports
CREATE POLICY "Users can view their own reports"
ON public.post_reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create reports"
ON public.post_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all reports (using the has_role function)
CREATE POLICY "Admins can view all reports"
ON public.post_reports FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
ON public.post_reports FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));