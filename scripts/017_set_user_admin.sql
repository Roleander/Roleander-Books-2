-- Simple script to set the first user as admin
-- Replace 'your-email@example.com' with your actual email

-- First, let's see what users exist
-- SELECT id, email, role FROM profiles;

-- Set the first user (or specific user) as admin
UPDATE profiles 
SET role = 'admin', 
    subscription_tier = 'premium',
    updated_at = NOW()
WHERE email = (
  SELECT email 
  FROM profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- Alternative: Set a specific user as admin by email
-- UPDATE profiles 
-- SET role = 'admin', 
--     subscription_tier = 'premium',
--     updated_at = NOW()
-- WHERE email = 'your-email@example.com';

-- Verify the update
SELECT id, email, role, subscription_tier, created_at FROM profiles ORDER BY created_at;
