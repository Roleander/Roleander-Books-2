-- Multi-Character Party System for Team-Based Audiobook Gameplay
-- This enables users to have multiple characters and form parties for enhanced storytelling

-- Character Parties Table
CREATE TABLE character_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  max_size INTEGER DEFAULT 4,
  is_active BOOLEAN DEFAULT true,
  party_theme VARCHAR(100), -- fantasy, sci-fi, mixed, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Character-Audiobook Assignments (many-to-many relationships)
CREATE TABLE character_audiobook_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_sheet_id UUID REFERENCES character_sheets(id) ON DELETE CASCADE,
  audiobook_id UUID REFERENCES audiobooks(id) ON DELETE CASCADE,
  assignment_type VARCHAR(50) DEFAULT 'primary', -- primary, companion, backup, specialist
  assignment_role VARCHAR(100), -- leader, tank, healer, dps, scout, etc.
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  performance_score DECIMAL(3,2) DEFAULT 0, -- 0-1 score for how well character performs
  UNIQUE(character_sheet_id, audiobook_id)
);

-- Party Membership Table
CREATE TABLE character_party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES character_parties(id) ON DELETE CASCADE,
  character_sheet_id UUID REFERENCES character_sheets(id) ON DELETE CASCADE,
  member_role VARCHAR(100), -- leader, member, reserve
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(party_id, character_sheet_id)
);

-- Party Synergy Effects
CREATE TABLE party_synergy_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES character_parties(id) ON DELETE CASCADE,
  effect_type VARCHAR(100) NOT NULL, -- stat_bonus, skill_bonus, special_ability
  effect_name VARCHAR(255) NOT NULL,
  effect_description TEXT,
  effect_value JSONB, -- flexible storage for different effect types
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Character Progression Sharing
CREATE TABLE character_progression_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_character_id UUID REFERENCES character_sheets(id) ON DELETE CASCADE,
  target_character_id UUID REFERENCES character_sheets(id) ON DELETE CASCADE,
  link_type VARCHAR(100) DEFAULT 'skill_sharing', -- skill_sharing, stat_sharing, item_sharing
  share_percentage DECIMAL(3,2) DEFAULT 0.5, -- 0-1, how much progression is shared
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_character_id, target_character_id, link_type)
);

-- Add columns to existing character_sheets table
ALTER TABLE character_sheets ADD COLUMN party_id UUID REFERENCES character_parties(id);
ALTER TABLE character_sheets ADD COLUMN character_role VARCHAR(100); -- primary, companion, specialist
ALTER TABLE character_sheets ADD COLUMN specialization VARCHAR(100); -- combat, magic, stealth, social, technical, survival
ALTER TABLE character_sheets ADD COLUMN is_primary BOOLEAN DEFAULT false;
ALTER TABLE character_sheets ADD COLUMN level_progression_shared BOOLEAN DEFAULT false;

-- Indexes for performance
CREATE INDEX idx_character_parties_user ON character_parties(user_id);
CREATE INDEX idx_character_audiobook_assignments_character ON character_audiobook_assignments(character_sheet_id);
CREATE INDEX idx_character_audiobook_assignments_audiobook ON character_audiobook_assignments(audiobook_id);
CREATE INDEX idx_character_party_members_party ON character_party_members(party_id);
CREATE INDEX idx_character_party_members_character ON character_party_members(character_sheet_id);
CREATE INDEX idx_party_synergy_effects_party ON party_synergy_effects(party_id);
CREATE INDEX idx_character_progression_links_source ON character_progression_links(source_character_id);
CREATE INDEX idx_character_progression_links_target ON character_progression_links(target_character_id);

-- Row Level Security
ALTER TABLE character_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_audiobook_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_synergy_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_progression_links ENABLE ROW LEVEL SECURITY;

-- Policies for character_parties
CREATE POLICY "Users can manage their own parties" ON character_parties
  FOR ALL USING (auth.uid() = user_id);

-- Policies for character_audiobook_assignments
CREATE POLICY "Users can manage their character assignments" ON character_audiobook_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM character_sheets cs
      WHERE cs.id = character_audiobook_assignments.character_sheet_id
      AND cs.user_id = auth.uid()
    )
  );

-- Policies for character_party_members
CREATE POLICY "Users can manage their party memberships" ON character_party_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM character_parties cp
      WHERE cp.id = character_party_members.party_id
      AND cp.user_id = auth.uid()
    )
  );

-- Policies for party_synergy_effects
CREATE POLICY "Users can view their party synergy effects" ON party_synergy_effects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM character_parties cp
      WHERE cp.id = party_synergy_effects.party_id
      AND cp.user_id = auth.uid()
    )
  );

-- Policies for character_progression_links
CREATE POLICY "Users can manage their character progression links" ON character_progression_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM character_sheets cs
      WHERE cs.id = character_progression_links.source_character_id
      AND cs.user_id = auth.uid()
    )
  );

-- Functions for party management

-- Function to create a new party
CREATE OR REPLACE FUNCTION create_character_party(
  p_user_id UUID,
  p_party_name VARCHAR(255),
  p_description TEXT DEFAULT NULL,
  p_max_size INTEGER DEFAULT 4,
  p_party_theme VARCHAR(100) DEFAULT 'mixed'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_party_id UUID;
BEGIN
  INSERT INTO character_parties (
    user_id,
    name,
    description,
    max_size,
    party_theme
  ) VALUES (
    p_user_id,
    p_party_name,
    p_description,
    p_max_size,
    p_party_theme
  )
  RETURNING id INTO v_party_id;

  RETURN v_party_id;
END;
$$;

-- Function to add character to party
CREATE OR REPLACE FUNCTION add_character_to_party(
  p_party_id UUID,
  p_character_id UUID,
  p_member_role VARCHAR(100) DEFAULT 'member'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_party_size INTEGER;
  v_max_size INTEGER;
  v_user_id UUID;
BEGIN
  -- Check if party exists and get user
  SELECT user_id, max_size INTO v_user_id, v_max_size
  FROM character_parties
  WHERE id = p_party_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Party not found';
  END IF;

  -- Check if character belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM character_sheets
    WHERE id = p_character_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Character does not belong to party owner';
  END IF;

  -- Check current party size
  SELECT COUNT(*) INTO v_party_size
  FROM character_party_members
  WHERE party_id = p_party_id AND is_active = true;

  IF v_party_size >= v_max_size THEN
    RAISE EXCEPTION 'Party is already at maximum size';
  END IF;

  -- Add character to party
  INSERT INTO character_party_members (
    party_id,
    character_sheet_id,
    member_role
  ) VALUES (
    p_party_id,
    p_character_id,
    p_member_role
  )
  ON CONFLICT (party_id, character_sheet_id) DO UPDATE SET
    member_role = EXCLUDED.member_role,
    is_active = true;

  -- Update character's party_id
  UPDATE character_sheets
  SET party_id = p_party_id
  WHERE id = p_character_id;

  RETURN true;
END;
$$;

-- Function to assign character to audiobook
CREATE OR REPLACE FUNCTION assign_character_to_audiobook(
  p_character_id UUID,
  p_audiobook_id UUID,
  p_assignment_type VARCHAR(50) DEFAULT 'primary',
  p_assignment_role VARCHAR(100) DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO character_audiobook_assignments (
    character_sheet_id,
    audiobook_id,
    assignment_type,
    assignment_role
  ) VALUES (
    p_character_id,
    p_audiobook_id,
    p_assignment_type,
    p_assignment_role
  )
  ON CONFLICT (character_sheet_id, audiobook_id) DO UPDATE SET
    assignment_type = EXCLUDED.assignment_type,
    assignment_role = EXCLUDED.assignment_role,
    is_active = true,
    assigned_at = NOW();

  RETURN true;
END;
$$;

-- Function to calculate party synergy effects
CREATE OR REPLACE FUNCTION calculate_party_synergy(p_party_id UUID)
RETURNS TABLE (
  effect_type VARCHAR(100),
  effect_name VARCHAR(255),
  effect_description TEXT,
  effect_value JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_member_count INTEGER;
  v_specializations JSONB;
  v_avg_level INTEGER;
BEGIN
  -- Get party member count and specializations
  SELECT
    COUNT(*) as member_count,
    jsonb_object_agg(
      COALESCE(cs.specialization, 'general'),
      1
    ) as specializations,
    ROUND(AVG(cs.level)) as avg_level
  INTO v_member_count, v_specializations, v_avg_level
  FROM character_party_members cpm
  JOIN character_sheets cs ON cpm.character_sheet_id = cs.id
  WHERE cpm.party_id = p_party_id AND cpm.is_active = true;

  -- Return synergy effects based on party composition
  RETURN QUERY
  SELECT
    'party_bonus'::VARCHAR(100) as effect_type,
    'Party Unity'::VARCHAR(255) as effect_name,
    'All party members gain bonuses from working together'::TEXT as effect_description,
    jsonb_build_object(
      'health_bonus', v_member_count * 5,
      'mana_bonus', v_member_count * 3,
      'experience_bonus', v_member_count * 0.1
    ) as effect_value
  WHERE v_member_count >= 2

  UNION ALL

  SELECT
    'specialization_bonus'::VARCHAR(100) as effect_type,
    'Specialized Team'::VARCHAR(255) as effect_name,
    'Party has complementary specializations'::TEXT as effect_description,
    jsonb_build_object(
      'skill_bonus', jsonb_build_object('multiplier', 1.2),
      'specialization_count', jsonb_object_keys(v_specializations)
    ) as effect_value
  WHERE jsonb_object_keys(v_specializations) IS NOT NULL

  UNION ALL

  SELECT
    'leadership_bonus'::VARCHAR(100) as effect_type,
    'Experienced Leadership'::VARCHAR(255) as effect_name,
    'High-level characters provide leadership bonuses'::TEXT as effect_description,
    jsonb_build_object(
      'charisma_bonus', GREATEST(0, v_avg_level - 5),
      'morale_bonus', GREATEST(0, v_avg_level - 3)
    ) as effect_value
  WHERE v_avg_level >= 5;
END;
$$;

-- Function to get user's active parties with member details
CREATE OR REPLACE FUNCTION get_user_parties(p_user_id UUID)
RETURNS TABLE (
  party_id UUID,
  party_name VARCHAR(255),
  party_description TEXT,
  max_size INTEGER,
  current_size INTEGER,
  party_theme VARCHAR(100),
  members JSONB,
  synergy_effects JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id as party_id,
    cp.name as party_name,
    cp.description as party_description,
    cp.max_size,
    COUNT(cpm.id) as current_size,
    cp.party_theme,
    jsonb_agg(
      jsonb_build_object(
        'character_id', cs.id,
        'character_name', cs.name,
        'level', cs.level,
        'character_class', cs.character_class,
        'specialization', cs.specialization,
        'member_role', cpm.member_role
      )
    ) FILTER (WHERE cs.id IS NOT NULL) as members,
    (SELECT jsonb_agg(
      jsonb_build_object(
        'effect_type', pse.effect_type,
        'effect_name', pse.effect_name,
        'effect_description', pse.effect_description,
        'effect_value', pse.effect_value
      )
    ) FROM party_synergy_effects pse WHERE pse.party_id = cp.id AND pse.is_active = true) as synergy_effects
  FROM character_parties cp
  LEFT JOIN character_party_members cpm ON cp.id = cpm.party_id AND cpm.is_active = true
  LEFT JOIN character_sheets cs ON cpm.character_sheet_id = cs.id
  WHERE cp.user_id = p_user_id AND cp.is_active = true
  GROUP BY cp.id, cp.name, cp.description, cp.max_size, cp.party_theme
  ORDER BY cp.created_at DESC;
END;
$$;

-- Function to get characters available for audiobook
CREATE OR REPLACE FUNCTION get_available_characters_for_audiobook(
  p_user_id UUID,
  p_audiobook_id UUID
)
RETURNS TABLE (
  character_id UUID,
  character_name VARCHAR(255),
  level INTEGER,
  character_class VARCHAR(255),
  specialization VARCHAR(100),
  is_assigned BOOLEAN,
  assignment_type VARCHAR(50),
  compatibility_score DECIMAL(3,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_audiobook_genre VARCHAR(100);
  v_audiobook_tags TEXT[];
BEGIN
  -- Get audiobook details
  SELECT genre, tags INTO v_audiobook_genre, v_audiobook_tags
  FROM audiobooks WHERE id = p_audiobook_id;

  RETURN QUERY
  SELECT
    cs.id as character_id,
    cs.name as character_name,
    cs.level,
    cs.character_class,
    cs.specialization,
    CASE WHEN caa.id IS NOT NULL THEN true ELSE false END as is_assigned,
    caa.assignment_type,
    -- Calculate compatibility score based on specialization and genre matching
    CASE
      WHEN cs.specialization = 'combat' AND v_audiobook_genre IN ('fantasy', 'action') THEN 0.9
      WHEN cs.specialization = 'magic' AND v_audiobook_genre IN ('fantasy', 'sci-fi') THEN 0.9
      WHEN cs.specialization = 'stealth' AND v_audiobook_genre IN ('mystery', 'horror') THEN 0.9
      WHEN cs.specialization = 'social' AND v_audiobook_genre IN ('drama', 'romance') THEN 0.9
      WHEN cs.specialization = 'technical' AND v_audiobook_genre = 'sci-fi' THEN 0.9
      WHEN cs.specialization = 'survival' AND v_audiobook_genre = 'horror' THEN 0.9
      ELSE 0.5
    END as compatibility_score
  FROM character_sheets cs
  LEFT JOIN character_audiobook_assignments caa ON cs.id = caa.character_sheet_id
    AND caa.audiobook_id = p_audiobook_id AND caa.is_active = true
  WHERE cs.user_id = p_user_id
  ORDER BY compatibility_score DESC, cs.level DESC;
END;
$$;

-- Sample data for testing
INSERT INTO character_parties (user_id, name, description, max_size, party_theme) VALUES
('00000000-0000-0000-0000-000000000000', 'Heroes of Eldoria', 'A brave group of adventurers', 4, 'fantasy'),
('00000000-0000-0000-0000-000000000000', 'Space Explorers', 'Bold explorers of the cosmos', 3, 'sci-fi');

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_party_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_character_parties_updated_at
  BEFORE UPDATE ON character_parties
  FOR EACH ROW EXECUTE FUNCTION update_party_updated_at_column();