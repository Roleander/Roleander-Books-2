-- Fix RLS policies for choice_sources table
-- Add missing INSERT, UPDATE, DELETE policies for admin operations

-- Add INSERT policy for choice_sources (allow authenticated users to insert)
CREATE POLICY "Authenticated users can insert choice sources" ON public.choice_sources
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Add UPDATE policy for choice_sources (allow authenticated users to update)
CREATE POLICY "Authenticated users can update choice sources" ON public.choice_sources
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Add DELETE policy for choice_sources (allow authenticated users to delete)
CREATE POLICY "Authenticated users can delete choice sources" ON public.choice_sources
  FOR DELETE USING (auth.uid() IS NOT NULL);
