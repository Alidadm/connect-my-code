-- Create storage bucket for post media (images, videos, GIFs, audio, documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media', 
  'post-media', 
  true, 
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'video/mp4', 
    'video/webm', 
    'video/quicktime',
    'audio/mpeg', 
    'audio/wav', 
    'audio/ogg',
    'audio/mp4',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
);

-- RLS Policy: Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload their own media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Allow public read access to all post media
CREATE POLICY "Public can view post media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'post-media');

-- RLS Policy: Allow users to update their own files
CREATE POLICY "Users can update their own media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'post-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Allow users to delete their own files
CREATE POLICY "Users can delete their own media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);