-- Create the missing database functions for admin role management

-- Function to safely get user profile
CREATE OR REPLACE FUNCTION get_user_profile_safe(user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT,
  subscription_expires_at TIMESTAMPTZ,
  role TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.subscription_tier,
    p.subscription_expires_at,
    p.role,
    p.logo_url,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.id = user_id;
END;
$$;

-- Function to bootstrap first admin user
CREATE OR REPLACE FUNCTION bootstrap_first_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_count INTEGER;
  user_email TEXT;
BEGIN
  -- Check if any admin users exist
  SELECT COUNT(*) INTO admin_count
  FROM profiles
  WHERE role = 'admin';
  
  -- If no admins exist, make this user an admin
  IF admin_count = 0 THEN
    -- Get user email from auth.users
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = user_id;
    
    -- Insert or update profile with admin role
    INSERT INTO profiles (id, email, role, full_name, subscription_tier, created_at, updated_at)
    VALUES (
      user_id,
      user_email,
      'admin',
      COALESCE(user_email, 'Admin User'),
      'premium',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      subscription_tier = 'premium',
      updated_at = NOW();
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION check_user_admin_safe(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;
  
  RETURN COALESCE(user_role = 'admin', FALSE);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_profile_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_first_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_admin_safe(UUID) TO authenticated;

-- Ensure the first user becomes admin if no admin exists
DO $$
DECLARE
  first_user_id UUID;
  admin_count INTEGER;
BEGIN
  -- Check if any admin users exist
  SELECT COUNT(*) INTO admin_count
  FROM profiles
  WHERE role = 'admin';
  
  -- If no admins exist, make the first user an admin
  IF admin_count = 0 THEN
    -- Get the first user from auth.users
    SELECT id INTO first_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
      -- Call the bootstrap function
      PERFORM bootstrap_first_admin(first_user_id);
    END IF;
  END IF;
END;
$$;
