-- Create a table for group content reports
CREATE TABLE public.group_content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.group_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.group_post_comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT report_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR 
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.group_content_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports" 
ON public.group_content_reports 
FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports" 
ON public.group_content_reports 
FOR SELECT 
USING (auth.uid() = reporter_id);

-- Group admins/moderators can view reports for their groups
CREATE POLICY "Moderators can view group reports" 
ON public.group_content_reports 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = group_content_reports.group_id 
    AND group_members.user_id = auth.uid() 
    AND group_members.role IN ('admin', 'moderator')
  )
);

-- Moderators can update report status
CREATE POLICY "Moderators can update reports" 
ON public.group_content_reports 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = group_content_reports.group_id 
    AND group_members.user_id = auth.uid() 
    AND group_members.role IN ('admin', 'moderator')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_group_content_reports_updated_at
BEFORE UPDATE ON public.group_content_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();