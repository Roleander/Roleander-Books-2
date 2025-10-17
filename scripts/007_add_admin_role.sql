-- Add admin role to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Update RLS policies to allow admins to manage content
-- Drop existing policies for series, audiobooks, and audio_choices
DROP POLICY IF EXISTS "Anyone can view series" ON public.series;
DROP POLICY IF EXISTS "Anyone can view audiobooks" ON public.audiobooks;
DROP POLICY IF EXISTS "Anyone can view audio choices" ON public.audio_choices;

-- Recreate policies with admin write access
CREATE POLICY "Anyone can view series" ON public.series
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage series" ON public.series
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Anyone can view audiobooks" ON public.audiobooks
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage audiobooks" ON public.audiobooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Anyone can view audio choices" ON public.audio_choices
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage audio choices" ON public.audio_choices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Update choice_sources policies for admin access
DROP POLICY IF EXISTS "Admins can insert choice sources" ON public.choice_sources;
DROP POLICY IF EXISTS "Admins can update choice sources" ON public.choice_sources;
DROP POLICY IF EXISTS "Admins can delete choice sources" ON public.choice_sources;

CREATE POLICY "Admins can manage choice sources" ON public.choice_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_id 
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
