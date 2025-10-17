-- Complete system fix for RLS recursion and admin bootstrap
-- This script fixes all database issues and creates safe functions

-- First, drop any existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Add role column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
    END IF;
END $$;

-- Create safe functions that bypass RLS
CREATE OR REPLACE FUNCTION get_user_profile_safe(user_id UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    subscription_tier TEXT,
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    role TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.full_name, p.email, p.subscription_tier, p.subscription_expires_at, p.created_at, p.role
    FROM profiles p
    WHERE p.id = user_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_user_profile_safe(user_id UUID, new_full_name TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE profiles 
    SET full_name = new_full_name
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION check_user_admin_safe(user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
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

CREATE OR REPLACE FUNCTION has_admin_users()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count
    FROM profiles
    WHERE role = 'admin';
    
    RETURN admin_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION bootstrap_first_admin(user_email TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    admin_count INTEGER;
    user_id UUID;
BEGIN
    -- Check if any admins exist
    SELECT COUNT(*) INTO admin_count
    FROM profiles
    WHERE role = 'admin';
    
    -- Only allow bootstrap if no admins exist
    IF admin_count > 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Find user by email and make them admin
    SELECT id INTO user_id
    FROM profiles
    WHERE email = user_email;
    
    IF user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    UPDATE profiles
    SET role = 'admin'
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_users_safe()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    subscription_tier TEXT,
    role TEXT,
    created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.full_name, p.email, p.subscription_tier, p.role, p.created_at
    FROM profiles p
    ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION update_user_role_safe(target_user_id UUID, new_role TEXT, admin_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    admin_role TEXT;
BEGIN
    -- Check if the requesting user is admin
    SELECT role INTO admin_role
    FROM profiles
    WHERE id = admin_user_id;
    
    IF admin_role != 'admin' THEN
        RETURN FALSE;
    END IF;
    
    -- Update the target user's role
    UPDATE profiles
    SET role = new_role
    WHERE id = target_user_id;
    
    RETURN FOUND;
END;
$$;

-- Create simple RLS policies that don't cause recursion
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_profile_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile_safe(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_admin_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_admin_users() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION bootstrap_first_admin(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_all_users_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role_safe(UUID, TEXT, UUID) TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
