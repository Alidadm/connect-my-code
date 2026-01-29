-- Allow admins to upload to platform-gallery folder in post-media bucket
CREATE POLICY "Admins can upload platform gallery images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-media' 
  AND (storage.foldername(name))[1] = 'platform-gallery'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update platform gallery images
CREATE POLICY "Admins can update platform gallery images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'post-media' 
  AND (storage.foldername(name))[1] = 'platform-gallery'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete platform gallery images
CREATE POLICY "Admins can delete platform gallery images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-media' 
  AND (storage.foldername(name))[1] = 'platform-gallery'
  AND public.has_role(auth.uid(), 'admin')
);