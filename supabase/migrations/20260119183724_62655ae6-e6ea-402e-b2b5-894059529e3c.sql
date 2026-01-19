-- Create profile_details table for extended About section info
CREATE TABLE public.profile_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  -- Basic Information
  full_name TEXT,
  website TEXT,
  social_network_id TEXT,
  citizenships TEXT[], -- Array for multiple citizenships like USA, France
  languages TEXT[], -- Array for multiple languages like English, Spanish
  gender TEXT,
  -- Education & Work
  high_school TEXT,
  college TEXT,
  major TEXT,
  current_work TEXT,
  -- Places
  birthplace TEXT,
  current_residence TEXT,
  -- Family & Relationship
  relationship_status TEXT,
  -- Visibility settings
  show_email BOOLEAN DEFAULT false,
  show_phone BOOLEAN DEFAULT false,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create family_members table to link users as family
CREATE TABLE public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_member_id UUID NOT NULL,
  relationship TEXT NOT NULL, -- e.g., Mother, Father, Sister, Brother, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, family_member_id)
);

-- Enable RLS
ALTER TABLE public.profile_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_details
CREATE POLICY "Users can view any profile details" 
ON public.profile_details 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile details" 
ON public.profile_details 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile details" 
ON public.profile_details 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile details" 
ON public.profile_details 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for family_members
CREATE POLICY "Users can view family members" 
ON public.family_members 
FOR SELECT 
USING (true);

CREATE POLICY "Users can add their own family members" 
ON public.family_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own family members" 
ON public.family_members 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own family members" 
ON public.family_members 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_profile_details_updated_at
BEFORE UPDATE ON public.profile_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();