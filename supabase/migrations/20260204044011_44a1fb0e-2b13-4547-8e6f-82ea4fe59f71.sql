-- Add unique constraint on backup_date for upsert to work
ALTER TABLE public.database_backups 
ADD CONSTRAINT database_backups_backup_date_unique UNIQUE (backup_date);