-- Item Acquisition and Inventory System
-- Adds comprehensive item management with audio cues and voice commands

-- Items table - stores all available items in the game
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  item_type VARCHAR(50) NOT NULL DEFAULT 'misc', -- weapon, armor, consumable, quest_item, misc
  rarity VARCHAR(20) NOT NULL DEFAULT 'common', -- common, uncommon, rare, epic, legendary
  icon_url VARCHAR(500),
  max_quantity INTEGER DEFAULT 1, -- 0 = unlimited stacking
  is_consumable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Item effects table - defines stat modifications for items
CREATE TABLE IF NOT EXISTS item_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  stat_name VARCHAR(100) NOT NULL, -- strength, health, mana, intelligence, etc.
  effect_value INTEGER NOT NULL, -- +5, -2, etc.
  effect_type VARCHAR(20) NOT NULL DEFAULT 'permanent', -- permanent, temporary, conditional
  duration_seconds INTEGER, -- for temporary effects (null = permanent)
  condition_description TEXT, -- for conditional effects
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Character inventory table - tracks what items characters own
CREATE TABLE IF NOT EXISTS character_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_sheet_id UUID NOT NULL REFERENCES character_sheets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acquired_method VARCHAR(50) NOT NULL DEFAULT 'manual', -- audio_cue, voice_command, choice_reward, manual
  is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
  equipped_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(character_sheet_id, item_id)
);

-- Audio cues table - triggers automatic item acquisition during audio playback
CREATE TABLE IF NOT EXISTS audio_cues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audiobook_id UUID NOT NULL REFERENCES audiobooks(id) ON DELETE CASCADE,
  cue_timestamp_seconds INTEGER NOT NULL,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  cue_text VARCHAR(500), -- "You find a magical sword!" (optional display text)
  voice_command VARCHAR(100), -- "add sword" (for voice recognition)
  auto_acquire BOOLEAN NOT NULL DEFAULT TRUE, -- automatically add to inventory
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(audiobook_id, cue_timestamp_seconds, item_id)
);

-- Voice commands table - manual voice-activated item acquisition
CREATE TABLE IF NOT EXISTS voice_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_text VARCHAR(100) NOT NULL UNIQUE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_character_inventory_character_id ON character_inventory(character_sheet_id);
CREATE INDEX IF NOT EXISTS idx_character_inventory_item_id ON character_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_audio_cues_audiobook_id ON audio_cues(audiobook_id);
CREATE INDEX IF NOT EXISTS idx_audio_cues_timestamp ON audio_cues(cue_timestamp_seconds);
CREATE INDEX IF NOT EXISTS idx_item_effects_item_id ON item_effects(item_id);

-- Row Level Security (RLS) Policies
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_cues ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_commands ENABLE ROW LEVEL SECURITY;

-- Items: readable by all authenticated users, writable by admins
CREATE POLICY "Items are viewable by authenticated users" ON items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Items are manageable by admins" ON items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Item effects: same as items
CREATE POLICY "Item effects are viewable by authenticated users" ON item_effects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Item effects are manageable by admins" ON item_effects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Character inventory: users can only see/modify their own characters' inventory
CREATE POLICY "Users can view their own character inventory" ON character_inventory
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM character_sheets cs
      WHERE cs.id = character_inventory.character_sheet_id
      AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own character inventory" ON character_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM character_sheets cs
      WHERE cs.id = character_inventory.character_sheet_id
      AND cs.user_id = auth.uid()
    )
  );

-- Audio cues: readable by all, writable by admins
CREATE POLICY "Audio cues are viewable by authenticated users" ON audio_cues
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Audio cues are manageable by admins" ON audio_cues
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Voice commands: readable by all, writable by admins
CREATE POLICY "Voice commands are viewable by authenticated users" ON voice_commands
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Voice commands are manageable by admins" ON voice_commands
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Functions for item management

-- Function to acquire an item for a character
CREATE OR REPLACE FUNCTION acquire_item(
  p_character_id UUID,
  p_item_id UUID,
  p_quantity INTEGER DEFAULT 1,
  p_acquired_method VARCHAR(50) DEFAULT 'manual'
) RETURNS UUID AS $$
DECLARE
  v_inventory_id UUID;
  v_existing_quantity INTEGER;
BEGIN
  -- Check if character already has this item
  SELECT quantity INTO v_existing_quantity
  FROM character_inventory
  WHERE character_sheet_id = p_character_id AND item_id = p_item_id;

  IF v_existing_quantity IS NOT NULL THEN
    -- Update existing quantity
    UPDATE character_inventory
    SET quantity = quantity + p_quantity,
        acquired_at = NOW()
    WHERE character_sheet_id = p_character_id AND item_id = p_item_id
    RETURNING id INTO v_inventory_id;
  ELSE
    -- Insert new inventory item
    INSERT INTO character_inventory (
      character_sheet_id,
      item_id,
      quantity,
      acquired_method
    ) VALUES (
      p_character_id,
      p_item_id,
      p_quantity,
      p_acquired_method
    ) RETURNING id INTO v_inventory_id;
  END IF;

  RETURN v_inventory_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use/consume an item
CREATE OR REPLACE FUNCTION use_item(
  p_inventory_id UUID,
  p_character_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_item_id UUID;
  v_quantity INTEGER;
  v_is_consumable BOOLEAN;
  v_effects RECORD;
BEGIN
  -- Get item details
  SELECT ci.item_id, ci.quantity, i.is_consumable
  INTO v_item_id, v_quantity, v_is_consumable
  FROM character_inventory ci
  JOIN items i ON ci.item_id = i.id
  WHERE ci.id = p_inventory_id AND ci.character_sheet_id = p_character_id;

  IF v_item_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Apply item effects
  FOR v_effects IN
    SELECT * FROM item_effects WHERE item_id = v_item_id
  LOOP
    -- Apply stat modification (this would need to be integrated with character stats)
    -- For now, we'll just log the effect
    RAISE NOTICE 'Applying effect: % % %', v_effects.stat_name, v_effects.effect_value, v_effects.effect_type;
  END LOOP;

  -- If consumable, reduce quantity or remove
  IF v_is_consumable THEN
    IF v_quantity > 1 THEN
      UPDATE character_inventory
      SET quantity = quantity - 1
      WHERE id = p_inventory_id;
    ELSE
      DELETE FROM character_inventory WHERE id = p_inventory_id;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to equip/unequip an item
CREATE OR REPLACE FUNCTION toggle_equip_item(
  p_inventory_id UUID,
  p_character_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_equipped BOOLEAN;
  v_item_type VARCHAR(50);
BEGIN
  -- Get current equipped status and item type
  SELECT ci.is_equipped, i.item_type
  INTO v_current_equipped, v_item_type
  FROM character_inventory ci
  JOIN items i ON ci.item_id = i.id
  WHERE ci.id = p_inventory_id AND ci.character_sheet_id = p_character_id;

  IF v_current_equipped IS NULL THEN
    RETURN FALSE;
  END IF;

  -- If equipping, unequip any other items of the same type
  IF NOT v_current_equipped THEN
    UPDATE character_inventory
    SET is_equipped = FALSE, equipped_at = NULL
    WHERE character_sheet_id = p_character_id
      AND item_id IN (
        SELECT id FROM items WHERE item_type = v_item_type
      )
      AND id != p_inventory_id;
  END IF;

  -- Toggle equipped status
  UPDATE character_inventory
  SET is_equipped = NOT v_current_equipped,
      equipped_at = CASE WHEN NOT v_current_equipped THEN NOW() ELSE NULL END
  WHERE id = p_inventory_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample data for testing
INSERT INTO items (name, description, item_type, rarity, icon_url, max_quantity, is_consumable) VALUES
('Health Potion', 'Restores 50 health points', 'consumable', 'common', '/icons/health-potion.png', 10, true),
('Iron Sword', 'A sturdy iron sword', 'weapon', 'common', '/icons/iron-sword.png', 1, false),
('Leather Armor', 'Basic leather protection', 'armor', 'common', '/icons/leather-armor.png', 1, false),
('Magic Ring', 'Increases mana regeneration', 'accessory', 'rare', '/icons/magic-ring.png', 1, false),
('Ancient Tome', 'Contains forgotten knowledge', 'quest_item', 'epic', '/icons/ancient-tome.png', 1, false)
ON CONFLICT DO NOTHING;

-- Sample item effects
INSERT INTO item_effects (item_id, stat_name, effect_value, effect_type) VALUES
((SELECT id FROM items WHERE name = 'Health Potion'), 'health', 50, 'temporary'),
((SELECT id FROM items WHERE name = 'Iron Sword'), 'attack', 5, 'permanent'),
((SELECT id FROM items WHERE name = 'Leather Armor'), 'defense', 3, 'permanent'),
((SELECT id FROM items WHERE name = 'Magic Ring'), 'mana_regen', 2, 'permanent'),
((SELECT id FROM items WHERE name = 'Ancient Tome'), 'intelligence', 10, 'permanent')
ON CONFLICT DO NOTHING;

-- Sample voice commands
INSERT INTO voice_commands (command_text, item_id) VALUES
('add health potion', (SELECT id FROM items WHERE name = 'Health Potion')),
('add sword', (SELECT id FROM items WHERE name = 'Iron Sword')),
('add armor', (SELECT id FROM items WHERE name = 'Leather Armor')),
('add ring', (SELECT id FROM items WHERE name = 'Magic Ring')),
('add tome', (SELECT id FROM items WHERE name = 'Ancient Tome'))
ON CONFLICT DO NOTHING;

-- Update trigger for items table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();