-- Create table for scheduled birthday wishes
CREATE TABLE public.scheduled_birthday_wishes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_user_id UUID NOT NULL,
  message TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  posted_post_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_birthday_wishes ENABLE ROW LEVEL SECURITY;

-- Users can view their own scheduled wishes
CREATE POLICY "Users can view their own scheduled wishes"
ON public.scheduled_birthday_wishes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own scheduled wishes
CREATE POLICY "Users can create their own scheduled wishes"
ON public.scheduled_birthday_wishes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own scheduled wishes
CREATE POLICY "Users can update their own scheduled wishes"
ON public.scheduled_birthday_wishes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own scheduled wishes
CREATE POLICY "Users can delete their own scheduled wishes"
ON public.scheduled_birthday_wishes
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_scheduled_birthday_wishes_updated_at
BEFORE UPDATE ON public.scheduled_birthday_wishes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient querying by date
CREATE INDEX idx_scheduled_birthday_wishes_date ON public.scheduled_birthday_wishes(scheduled_date, status);