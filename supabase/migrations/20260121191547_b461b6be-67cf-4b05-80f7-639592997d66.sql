-- Add youtube_urls column to posts table
ALTER TABLE public.posts 
ADD COLUMN youtube_urls text[] DEFAULT '{}'::text[];