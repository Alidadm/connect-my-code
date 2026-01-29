-- Enable RLS on family_members table
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own family relationships
CREATE POLICY "Users can view their family members" 
ON public.family_members 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = family_member_id);

-- Policy: Users can add family members (must be the user_id)
CREATE POLICY "Users can add family members" 
ON public.family_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own family relationships
CREATE POLICY "Users can update their family relationships" 
ON public.family_members 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove family relationships they created
CREATE POLICY "Users can delete their family members" 
ON public.family_members 
FOR DELETE 
USING (auth.uid() = user_id);