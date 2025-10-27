-- Create character templates system for audiobook-specific character creation
-- This allows each audiobook to have predefined character templates that users can choose from

-- Character Templates Table
CREATE TABLE character_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(100), -- fantasy, sci-fi, mystery, horror, etc.
  difficulty VARCHAR(50) DEFAULT 'normal', -- easy, normal, hard
  artwork_url VARCHAR(500),

  -- Base character stats (JSONB for flexibility)
  base_stats JSONB DEFAULT '{
    "strength": 10,
    "intelligence": 10,
    "charisma": 10,
    "dexterity": 10,
    "constitution": 10,
    "wisdom": 10
  }',

  -- Base skills (array of skill objects)
  base_skills JSONB DEFAULT '[]',

  -- Starting inventory (array of item references)
  base_inventory JSONB DEFAULT '[]',

  -- Character background and personality
  background_story TEXT,
  personality_traits JSONB DEFAULT '[]',
  appearance_description TEXT,

  -- Template metadata
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audiobook-Character Template Junction Table
CREATE TABLE audiobook_character_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audiobook_id UUID REFERENCES audiobooks(id) ON DELETE CASCADE,
  character_template_id UUID REFERENCES character_templates(id) ON DELETE CASCADE,

  -- Template customization per audiobook
  is_default BOOLEAN DEFAULT false,
  custom_name VARCHAR(255), -- Override template name for this audiobook
  custom_description TEXT, -- Override template description
  custom_stats JSONB, -- Override base stats
  custom_skills JSONB, -- Override base skills
  custom_inventory JSONB, -- Override base inventory

  -- Display settings
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one default per audiobook
  UNIQUE(audiobook_id, character_template_id),
  CONSTRAINT single_default_per_audiobook
    EXCLUDE (audiobook_id WITH =)
    WHERE (is_default = true)
);

-- Add template_id to character_sheets for tracking which template was used
ALTER TABLE character_sheets ADD COLUMN template_id UUID REFERENCES character_templates(id);
ALTER TABLE character_sheets ADD COLUMN template_customizations JSONB DEFAULT '{}';

-- Indexes for performance
CREATE INDEX idx_character_templates_genre ON character_templates(genre);
CREATE INDEX idx_character_templates_active ON character_templates(is_active);
CREATE INDEX idx_audiobook_character_templates_audiobook ON audiobook_character_templates(audiobook_id);
CREATE INDEX idx_audiobook_character_templates_template ON audiobook_character_templates(character_template_id);
CREATE INDEX idx_audiobook_character_templates_default ON audiobook_character_templates(audiobook_id, is_default) WHERE is_default = true;

-- Row Level Security
ALTER TABLE character_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiobook_character_templates ENABLE ROW LEVEL SECURITY;

-- Policies for character_templates
CREATE POLICY "Anyone can view active character templates" ON character_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage character templates" ON character_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policies for audiobook_character_templates
CREATE POLICY "Anyone can view audiobook character templates" ON audiobook_character_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage audiobook character templates" ON audiobook_character_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Sample Character Templates
INSERT INTO character_templates (
  name,
  description,
  genre,
  difficulty,
  base_stats,
  base_skills,
  base_inventory,
  background_story,
  personality_traits,
  appearance_description
) VALUES
-- Fantasy Warrior
(
  'Young Warrior',
  'A determined young fighter seeking glory and adventure',
  'fantasy',
  'normal',
  '{
    "strength": 14,
    "intelligence": 8,
    "charisma": 12,
    "dexterity": 13,
    "constitution": 15,
    "wisdom": 10
  }',
  '[
    {"name": "Sword Fighting", "level": 2, "description": "Basic sword techniques"},
    {"name": "Shield Defense", "level": 1, "description": "Defensive combat with shields"},
    {"name": "Athletics", "level": 2, "description": "Physical fitness and endurance"}
  ]',
  '[
    {"item_name": "Iron Sword", "quantity": 1},
    {"item_name": "Wooden Shield", "quantity": 1},
    {"item_name": "Leather Armor", "quantity": 1},
    {"item_name": "Health Potion", "quantity": 2}
  ]',
  'Born in a small village, you''ve always dreamed of becoming a legendary warrior. After losing your family to bandits, you set out to protect others and find your place in the world.',
  '["Brave", "Loyal", "Quick-tempered", "Protective"]',
  'Tall and muscular with short brown hair, wearing well-worn leather armor and carrying a scarred iron sword.'
),

-- Sci-Fi Explorer
(
  'Space Explorer',
  'A curious scientist and explorer from the distant future',
  'sci-fi',
  'normal',
  '{
    "strength": 10,
    "intelligence": 16,
    "charisma": 13,
    "dexterity": 12,
    "constitution": 11,
    "wisdom": 14
  }',
  '[
    {"name": "Science", "level": 3, "description": "Scientific knowledge and research"},
    {"name": "Technology", "level": 2, "description": "Understanding of advanced technology"},
    {"name": "Navigation", "level": 2, "description": "Stellar navigation and piloting"}
  ]',
  '[
    {"item_name": "Data Pad", "quantity": 1},
    {"item_name": "Multi-Tool", "quantity": 1},
    {"item_name": "Energy Cell", "quantity": 3},
    {"item_name": "Emergency Beacon", "quantity": 1}
  ]',
  'As a member of the Galactic Exploration Corps, you''ve traveled to countless worlds, studying alien cultures and uncovering ancient mysteries. Your latest mission has taken you to uncharted territory.',
  '["Curious", "Analytical", "Adaptable", "Diplomatic"]',
  'Of average build with close-cropped hair, wearing a form-fitting exploration suit with various technological devices attached.'
),

-- Mystery Detective
(
  'Street Detective',
  'A sharp-witted investigator with a nose for trouble',
  'mystery',
  'normal',
  '{
    "strength": 12,
    "intelligence": 15,
    "charisma": 11,
    "dexterity": 14,
    "constitution": 13,
    "wisdom": 13
  }',
  '[
    {"name": "Investigation", "level": 3, "description": "Finding clues and solving puzzles"},
    {"name": "Perception", "level": 2, "description": "Noticing details others miss"},
    {"name": "Street Smarts", "level": 2, "description": "Knowledge of urban environments"}
  ]',
  '[
    {"item_name": "Notebook", "quantity": 1},
    {"item_name": "Magnifying Glass", "quantity": 1},
    {"item_name": "Lockpicks", "quantity": 1},
    {"item_name": "Disguise Kit", "quantity": 1}
  ]',
  'After years working as a police officer, you struck out on your own as a private investigator. Your reputation for solving impossible cases has made you both respected and feared in the criminal underworld.',
  '["Observant", "Skeptical", "Resourceful", "Independent"]',
  'Sharp-featured with keen eyes, dressed in a worn trench coat and fedora, always carrying a notebook and pen.'
),

-- Horror Survivor
(
  'Survivor',
  'A resourceful individual who has endured unimaginable horrors',
  'horror',
  'hard',
  '{
    "strength": 13,
    "intelligence": 12,
    "charisma": 8,
    "dexterity": 15,
    "constitution": 14,
    "wisdom": 11
  }',
  '[
    {"name": "Survival", "level": 3, "description": "Staying alive in dangerous situations"},
    {"name": "Stealth", "level": 2, "description": "Moving quietly and avoiding detection"},
    {"name": "Improvisation", "level": 2, "description": "Making do with limited resources"}
  ]',
  '[
    {"item_name": "Knife", "quantity": 1},
    {"item_name": "First Aid Kit", "quantity": 1},
    {"item_name": "Flashlight", "quantity": 1},
    {"item_name": "Rope", "quantity": 1}
  ]',
  'You''ve seen things that would break most people. After escaping a nightmare that claimed your loved ones, you now help others survive similar horrors. Trust doesn''t come easily anymore.',
  '["Paranoid", "Resilient", "Cunning", "Guarded"]',
  'Haggard appearance with dark circles under the eyes, dressed in practical clothing with multiple pockets for supplies.'
);

-- Function to get character templates for an audiobook
CREATE OR REPLACE FUNCTION get_audiobook_character_templates(audiobook_uuid UUID)
RETURNS TABLE (
  template_id UUID,
  template_name VARCHAR(255),
  template_description TEXT,
  genre VARCHAR(100),
  difficulty VARCHAR(50),
  artwork_url VARCHAR(500),
  base_stats JSONB,
  base_skills JSONB,
  base_inventory JSONB,
  background_story TEXT,
  personality_traits JSONB,
  appearance_description TEXT,
  is_default BOOLEAN,
  custom_name VARCHAR(255),
  custom_description TEXT,
  custom_stats JSONB,
  custom_skills JSONB,
  custom_inventory JSONB,
  sort_order INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.id as template_id,
    COALESCE(act.custom_name, ct.name) as template_name,
    COALESCE(act.custom_description, ct.description) as template_description,
    ct.genre,
    ct.difficulty,
    ct.artwork_url,
    COALESCE(act.custom_stats, ct.base_stats) as base_stats,
    COALESCE(act.custom_skills, ct.base_skills) as base_skills,
    COALESCE(act.custom_inventory, ct.base_inventory) as base_inventory,
    ct.background_story,
    ct.personality_traits,
    ct.appearance_description,
    act.is_default,
    act.custom_name,
    act.custom_description,
    act.custom_stats,
    act.custom_skills,
    act.custom_inventory,
    act.sort_order
  FROM audiobook_character_templates act
  JOIN character_templates ct ON act.character_template_id = ct.id
  WHERE act.audiobook_id = audiobook_uuid
    AND act.is_active = true
    AND ct.is_active = true
  ORDER BY act.sort_order, ct.name;
END;
$$;

-- Function to create character from template
CREATE OR REPLACE FUNCTION create_character_from_template(
  p_user_id UUID,
  p_audiobook_id UUID,
  p_template_id UUID,
  p_character_name VARCHAR(255) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_template_record RECORD;
  v_character_id UUID;
  v_final_name VARCHAR(255);
BEGIN
  -- Get template data
  SELECT * INTO v_template_record
  FROM get_audiobook_character_templates(p_audiobook_id)
  WHERE template_id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character template not found for this audiobook';
  END IF;

  -- Determine character name
  v_final_name := COALESCE(p_character_name, v_template_record.template_name);

  -- Create character sheet
  INSERT INTO character_sheets (
    user_id,
    audiobook_id,
    name,
    stats,
    skills,
    background,
    template_id,
    template_customizations
  ) VALUES (
    p_user_id,
    p_audiobook_id,
    v_final_name,
    v_template_record.base_stats,
    v_template_record.base_skills,
    v_template_record.background_story,
    p_template_id,
    jsonb_build_object(
      'original_template', v_template_record,
      'created_at', NOW()
    )
  )
  RETURNING id INTO v_character_id;

  -- Add starting inventory items
  -- Note: This assumes items exist in the items table
  -- In a real implementation, you'd need to handle item creation/acquisition

  RETURN v_character_id;
END;
$$;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_character_templates_updated_at
  BEFORE UPDATE ON character_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audiobook_character_templates_updated_at
  BEFORE UPDATE ON audiobook_character_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();