-- Create comprehensive database schema for interactive audiobook platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audiobook series table
CREATE TABLE IF NOT EXISTS public.series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  author TEXT,
  narrator TEXT,
  genre TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual audiobook chapters/episodes
CREATE TABLE IF NOT EXISTS public.audiobooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_file_url TEXT NOT NULL,
  duration_seconds INTEGER,
  chapter_number INTEGER,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interactive choices for branching narratives
CREATE TABLE IF NOT EXISTS public.audio_choices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audiobook_id UUID REFERENCES public.audiobooks(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  choice_number INTEGER NOT NULL,
  voice_command TEXT NOT NULL, -- What user says to select this choice
  next_audiobook_id UUID REFERENCES public.audiobooks(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User listening progress
CREATE TABLE IF NOT EXISTS public.listening_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  audiobook_id UUID REFERENCES public.audiobooks(id) ON DELETE CASCADE,
  progress_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_listened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, audiobook_id)
);

-- User bookmarks
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  audiobook_id UUID REFERENCES public.audiobooks(id) ON DELETE CASCADE,
  position_seconds INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, series_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audiobooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for series (public read, admin write)
CREATE POLICY "Anyone can view series" ON public.series
  FOR SELECT USING (true);

-- RLS Policies for audiobooks (public read, admin write)
CREATE POLICY "Anyone can view audiobooks" ON public.audiobooks
  FOR SELECT USING (true);

-- RLS Policies for audio_choices (public read, admin write)
CREATE POLICY "Anyone can view audio choices" ON public.audio_choices
  FOR SELECT USING (true);

-- RLS Policies for listening_progress
CREATE POLICY "Users can view their own progress" ON public.listening_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.listening_progress
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for bookmarks
CREATE POLICY "Users can manage their own bookmarks" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for favorites
CREATE POLICY "Users can manage their own favorites" ON public.favorites
  FOR ALL USING (auth.uid() = user_id);
