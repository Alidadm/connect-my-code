-- Create bookmark collections table
CREATE TABLE public.bookmark_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bookmark_collections ENABLE ROW LEVEL SECURITY;

-- Users can view their own collections
CREATE POLICY "Users can view their own collections"
ON public.bookmark_collections FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own collections
CREATE POLICY "Users can create their own collections"
ON public.bookmark_collections FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own collections
CREATE POLICY "Users can update their own collections"
ON public.bookmark_collections FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own collections
CREATE POLICY "Users can delete their own collections"
ON public.bookmark_collections FOR DELETE
USING (auth.uid() = user_id);

-- Add collection_id to bookmarks table
ALTER TABLE public.bookmarks 
ADD COLUMN collection_id UUID REFERENCES public.bookmark_collections(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_bookmark_collections_user_id ON public.bookmark_collections(user_id);
CREATE INDEX idx_bookmarks_collection_id ON public.bookmarks(collection_id);

-- Add trigger for updated_at
CREATE TRIGGER update_bookmark_collections_updated_at
BEFORE UPDATE ON public.bookmark_collections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();