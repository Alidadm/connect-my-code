-- Create storage bucket for marketplace images
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-images', 'marketplace-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to marketplace-images bucket
CREATE POLICY "Authenticated users can upload marketplace images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'marketplace-images' AND auth.uid() IS NOT NULL);

-- Anyone can view marketplace images
CREATE POLICY "Anyone can view marketplace images"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketplace-images');

-- Users can delete their own images
CREATE POLICY "Users can delete their marketplace images"
ON storage.objects FOR DELETE
USING (bucket_id = 'marketplace-images' AND auth.uid()::text = (storage.foldername(name))[1]);