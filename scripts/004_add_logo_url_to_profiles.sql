-- Add logo_url column to profiles table for custom branding

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.logo_url IS 'URL to custom brand logo uploaded by admin users';
