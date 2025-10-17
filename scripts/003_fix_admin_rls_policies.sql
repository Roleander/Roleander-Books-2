-- Fix RLS policies to allow admin operations on series, audiobooks, and audio_choices tables

-- Add INSERT, UPDATE, DELETE policies for series table
-- For now, allowing any authenticated user to perform admin operations
-- In production, you'd want proper role-based access control

CREATE POLICY "Authenticated users can insert series" ON public.series
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update series" ON public.series
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete series" ON public.series
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add INSERT, UPDATE, DELETE policies for audiobooks table
CREATE POLICY "Authenticated users can insert audiobooks" ON public.audiobooks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update audiobooks" ON public.audiobooks
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete audiobooks" ON public.audiobooks
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add INSERT, UPDATE, DELETE policies for audio_choices table
CREATE POLICY "Authenticated users can insert audio choices" ON public.audio_choices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update audio choices" ON public.audio_choices
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete audio choices" ON public.audio_choices
  FOR DELETE USING (auth.role() = 'authenticated');
