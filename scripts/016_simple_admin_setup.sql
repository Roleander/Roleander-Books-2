-- Simple admin setup - just ensure the first user becomes admin
-- This script is much simpler and should work reliably

-- First, let's make sure we have the basic structure
-- Update the first user to be admin if no admin exists
UPDATE profiles 
SET role = 'admin', subscription_tier = 'premium', updated_at = NOW()
WHERE id = (
  SELECT id FROM profiles 
  WHERE role IS NULL OR role != 'admin'
  ORDER BY created_at ASC 
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE role = 'admin'
);

-- If no profiles exist yet, we'll handle this in the application code
-- This ensures at least one admin exists if profiles are already created
