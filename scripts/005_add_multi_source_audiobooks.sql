-- Create junction table for multiple source audiobooks per choice
-- Add support for multiple source audiobooks per interactive choice

-- Create junction table for choice sources
CREATE TABLE IF NOT EXISTS public.choice_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  choice_id UUID REFERENCES public.audio_choices(id) ON DELETE CASCADE,
  audiobook_id UUID REFERENCES public.audiobooks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(choice_id, audiobook_id)
);

-- Enable RLS for the new table
ALTER TABLE public.choice_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policy for choice_sources (public read, admin write)
CREATE POLICY "Anyone can view choice sources" ON public.choice_sources
  FOR SELECT USING (true);

-- Remove the old single audiobook_id column from audio_choices
-- We'll keep it for now to avoid breaking existing data, but it will be deprecated
-- ALTER TABLE public.audio_choices DROP COLUMN audiobook_id;

-- Add a comment to indicate the old column is deprecated
COMMENT ON COLUMN public.audio_choices.audiobook_id IS 'DEPRECATED: Use choice_sources table instead';
