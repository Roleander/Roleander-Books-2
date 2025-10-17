-- Create character system tables for RPG-style audiobook progression

-- Character sheets table (main character profiles)
CREATE TABLE IF NOT EXISTS character_sheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  character_class VARCHAR(100) DEFAULT 'Adventurer',
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  experience_to_next INTEGER DEFAULT 100,
  health INTEGER DEFAULT 100,
  max_health INTEGER DEFAULT 100,
  mana INTEGER DEFAULT 50,
  max_mana INTEGER DEFAULT 50,
  gold INTEGER DEFAULT 0,
  description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Character stats table (flexible stat system)
CREATE TABLE IF NOT EXISTS character_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_sheet_id UUID NOT NULL REFERENCES character_sheets(id) ON DELETE CASCADE,
  stat_name VARCHAR(100) NOT NULL,
  stat_value INTEGER DEFAULT 0,
  max_value INTEGER DEFAULT 100,
  stat_category VARCHAR(50) DEFAULT 'core', -- core, combat, magic, social, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(character_sheet_id, stat_name)
);

-- Book-specific character progression
CREATE TABLE IF NOT EXISTS book_characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_sheet_id UUID NOT NULL REFERENCES character_sheets(id) ON DELETE CASCADE,
  audiobook_id UUID NOT NULL REFERENCES audiobooks(id) ON DELETE CASCADE,
  book_level INTEGER DEFAULT 1,
  book_experience INTEGER DEFAULT 0,
  chapters_completed INTEGER DEFAULT 0,
  choices_made JSONB DEFAULT '[]',
  achievements JSONB DEFAULT '[]',
  current_health INTEGER,
  current_mana INTEGER,
  inventory JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(character_sheet_id, audiobook_id)
);

-- Character inventory/equipment
CREATE TABLE IF NOT EXISTS character_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_sheet_id UUID NOT NULL REFERENCES character_sheets(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  item_type VARCHAR(50) DEFAULT 'misc', -- weapon, armor, potion, quest_item, etc.
  item_description TEXT,
  item_value INTEGER DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  equipped BOOLEAN DEFAULT FALSE,
  stat_modifiers JSONB DEFAULT '{}', -- {"strength": 5, "health": 10}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Character achievements/quests
CREATE TABLE IF NOT EXISTS character_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_sheet_id UUID NOT NULL REFERENCES character_sheets(id) ON DELETE CASCADE,
  achievement_name VARCHAR(255) NOT NULL,
  achievement_description TEXT,
  achievement_type VARCHAR(50) DEFAULT 'general', -- reading, combat, social, etc.
  experience_reward INTEGER DEFAULT 0,
  gold_reward INTEGER DEFAULT 0,
  stat_rewards JSONB DEFAULT '{}',
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  audiobook_id UUID REFERENCES audiobooks(id), -- NULL for general achievements
  UNIQUE(character_sheet_id, achievement_name)
);

-- Insert default stats for new characters
INSERT INTO character_stats (character_sheet_id, stat_name, stat_value, max_value, stat_category) VALUES
  -- Core stats
  ('default-char-id', 'Strength', 10, 100, 'core'),
  ('default-char-id', 'Dexterity', 10, 100, 'core'),
  ('default-char-id', 'Constitution', 10, 100, 'core'),
  ('default-char-id', 'Intelligence', 10, 100, 'core'),
  ('default-char-id', 'Wisdom', 10, 100, 'core'),
  ('default-char-id', 'Charisma', 10, 100, 'core'),

  -- Combat stats
  ('default-char-id', 'Attack', 5, 100, 'combat'),
  ('default-char-id', 'Defense', 5, 100, 'combat'),
  ('default-char-id', 'Accuracy', 10, 100, 'combat'),
  ('default-char-id', 'Evasion', 5, 100, 'combat'),

  -- Magic stats
  ('default-char-id', 'Spell Power', 5, 100, 'magic'),
  ('default-char-id', 'Mana Regeneration', 2, 50, 'magic'),
  ('default-char-id', 'Spell Resistance', 0, 100, 'magic'),

  -- Social stats
  ('default-char-id', 'Persuasion', 10, 100, 'social'),
  ('default-char-id', 'Intimidation', 5, 100, 'social'),
  ('default-char-id', 'Deception', 5, 100, 'social'),
  ('default-char-id', 'Insight', 10, 100, 'social');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_character_sheets_user_id ON character_sheets(user_id);
CREATE INDEX IF NOT EXISTS idx_character_stats_sheet_id ON character_stats(character_sheet_id);
CREATE INDEX IF NOT EXISTS idx_book_characters_sheet_id ON book_characters(character_sheet_id);
CREATE INDEX IF NOT EXISTS idx_book_characters_audiobook_id ON book_characters(audiobook_id);
CREATE INDEX IF NOT EXISTS idx_character_inventory_sheet_id ON character_inventory(character_sheet_id);
CREATE INDEX IF NOT EXISTS idx_character_achievements_sheet_id ON character_achievements(character_sheet_id);

-- Enable RLS (Row Level Security)
ALTER TABLE character_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own character sheets" ON character_sheets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own character sheets" ON character_sheets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own character sheets" ON character_sheets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own character sheets" ON character_sheets
  FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for other tables
CREATE POLICY "Users can manage their character stats" ON character_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM character_sheets
      WHERE character_sheets.id = character_stats.character_sheet_id
      AND character_sheets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their book characters" ON book_characters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM character_sheets
      WHERE character_sheets.id = book_characters.character_sheet_id
      AND character_sheets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their character inventory" ON character_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM character_sheets
      WHERE character_sheets.id = character_inventory.character_sheet_id
      AND character_sheets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their character achievements" ON character_achievements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM character_sheets
      WHERE character_sheets.id = character_achievements.character_sheet_id
      AND character_sheets.user_id = auth.uid()
    )
  );

-- Function to create default character for new users
CREATE OR REPLACE FUNCTION create_default_character(user_id UUID, character_name TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  char_id UUID;
  default_name TEXT;
BEGIN
  -- Generate default name if not provided
  IF character_name IS NULL THEN
    SELECT COALESCE(full_name, email) INTO default_name
    FROM profiles WHERE id = user_id;

    IF default_name IS NULL THEN
      default_name := 'Adventurer';
    END IF;
  ELSE
    default_name := character_name;
  END IF;

  -- Create character sheet
  INSERT INTO character_sheets (user_id, name, character_class, level, experience, health, max_health, mana, max_mana)
  VALUES (user_id, default_name, 'Adventurer', 1, 0, 100, 100, 50, 50)
  RETURNING id INTO char_id;

  -- Create default stats
  INSERT INTO character_stats (character_sheet_id, stat_name, stat_value, max_value, stat_category)
  VALUES
    (char_id, 'Strength', 10, 100, 'core'),
    (char_id, 'Dexterity', 10, 100, 'core'),
    (char_id, 'Constitution', 10, 100, 'core'),
    (char_id, 'Intelligence', 10, 100, 'core'),
    (char_id, 'Wisdom', 10, 100, 'core'),
    (char_id, 'Charisma', 10, 100, 'core'),
    (char_id, 'Attack', 5, 100, 'combat'),
    (char_id, 'Defense', 5, 100, 'combat'),
    (char_id, 'Spell Power', 5, 100, 'magic'),
    (char_id, 'Persuasion', 10, 100, 'social');

  RETURN char_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to level up character
CREATE OR REPLACE FUNCTION level_up_character(character_id UUID)
RETURNS VOID AS $$
DECLARE
  current_level INTEGER;
  new_level INTEGER;
BEGIN
  SELECT level INTO current_level FROM character_sheets WHERE id = character_id;

  IF current_level IS NULL THEN
    RAISE EXCEPTION 'Character not found';
  END IF;

  new_level := current_level + 1;

  -- Update character level and reset experience
  UPDATE character_sheets
  SET level = new_level,
      experience = 0,
      experience_to_next = new_level * 100,
      max_health = max_health + 10,
      health = max_health + 10,
      max_mana = max_mana + 5,
      mana = max_mana + 5,
      updated_at = NOW()
  WHERE id = character_id;

  -- Increase some stats on level up
  UPDATE character_stats
  SET stat_value = LEAST(stat_value + 1, max_value)
  WHERE character_sheet_id = character_id
    AND stat_category IN ('core', 'combat', 'magic', 'social');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add experience and check for level up
CREATE OR REPLACE FUNCTION add_character_experience(character_id UUID, exp_amount INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_exp INTEGER;
  exp_needed INTEGER;
  leveled_up BOOLEAN := FALSE;
BEGIN
  SELECT experience, experience_to_next INTO current_exp, exp_needed
  FROM character_sheets WHERE id = character_id;

  IF current_exp IS NULL THEN
    RAISE EXCEPTION 'Character not found';
  END IF;

  -- Add experience
  UPDATE character_sheets
  SET experience = experience + exp_amount,
      updated_at = NOW()
  WHERE id = character_id;

  -- Check if leveled up
  IF current_exp + exp_amount >= exp_needed THEN
    PERFORM level_up_character(character_id);
    leveled_up := TRUE;
  END IF;

  RETURN leveled_up;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;