-- Create backup history table
CREATE TABLE public.database_backups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_date date NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  tables_included text[] NOT NULL,
  row_counts jsonb,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.database_backups ENABLE ROW LEVEL SECURITY;

-- Admin can view all backups
CREATE POLICY "Admins can view backups"
  ON public.database_backups
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can insert backups
CREATE POLICY "Admins can insert backups"
  ON public.database_backups
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can update backups
CREATE POLICY "Admins can update backups"
  ON public.database_backups
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete backups
CREATE POLICY "Admins can delete backups"
  ON public.database_backups
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for backups (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('database-backups', 'database-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for admin access only
CREATE POLICY "Admins can upload backups"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'database-backups' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can read backups"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'database-backups' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete backups"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'database-backups' 
    AND public.has_role(auth.uid(), 'admin')
  );