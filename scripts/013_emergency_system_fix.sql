-- Emergency system fix to resolve infinite recursion and bootstrap admin functionality
-- This script creates all necessary functions and fixes RLS policies

-- First, drop any existing problematic policies to prevent conflicts
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create safe functions that bypass RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.has_admin_users()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_count integer;
BEGIN
    -- Use a direct query with security definer to bypass RLS
    SELECT COUNT(*) INTO admin_count
    FROM profiles
    WHERE role = 'admin';
    
    RETURN admin_count > 0;
EXCEPTION
    WHEN OTHERS THEN
        -- If there's any error (like column doesn't exist), assume no admins
        RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_exists boolean;
    profile_exists boolean;
BEGIN
    -- Check if any admin already exists
    SELECT public.has_admin_users() INTO admin_exists;
    
    IF admin_exists THEN
        RETURN false; -- Admin already exists, don't bootstrap
    END IF;
    
    -- Check if user profile exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id) INTO profile_exists;
    
    IF NOT profile_exists THEN
        -- Create profile if it doesn't exist
        INSERT INTO profiles (id, role, subscription_tier)
        VALUES (user_id, 'admin', 'premium')
        ON CONFLICT (id) DO UPDATE SET role = 'admin';
    ELSE
        -- Update existing profile to admin
        UPDATE profiles SET role = 'admin' WHERE id = user_id;
    END IF;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid)
RETURNS TABLE(id uuid, role text, subscription_tier text, logo_url text, full_name text, email text, created_at timestamptz, subscription_expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.role, p.subscription_tier, p.logo_url, p.full_name, 
           (SELECT email FROM auth.users WHERE id = p.id) as email,
           p.created_at, p.subscription_expires_at
    FROM profiles p
    WHERE p.id = user_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Return empty result if error
        RETURN;
END;
$$;

-- Added get_user_profile_safe function for profile page
CREATE OR REPLACE FUNCTION public.get_user_profile_safe(user_id uuid)
RETURNS TABLE(id uuid, role text, subscription_tier text, logo_url text, full_name text, email text, created_at timestamptz, subscription_expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.get_user_profile(user_id);
END;
$$;

-- Added update_user_profile_safe function for profile updates
CREATE OR REPLACE FUNCTION public.update_user_profile_safe(user_id uuid, new_full_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE profiles 
    SET full_name = new_full_name
    WHERE id = user_id;
    
    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- Added check_user_admin_safe function for admin access control
CREATE OR REPLACE FUNCTION public.check_user_admin_safe(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM profiles
    WHERE id = user_id;
    
    RETURN COALESCE(user_role, 'user') = 'admin';
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM profiles
    WHERE id = user_id;
    
    RETURN COALESCE(user_role, 'user');
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'user';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_subscription_tier(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tier text;
BEGIN
    SELECT subscription_tier INTO tier
    FROM profiles
    WHERE id = user_id;
    
    RETURN COALESCE(tier, 'free');
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'free';
END;
$$;

-- Ensure the role column exists in profiles table
DO $$
BEGIN
    -- Add role column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role text DEFAULT 'user';
    END IF;
    
    -- Add subscription_tier column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
    ) THEN
        ALTER TABLE profiles ADD COLUMN subscription_tier text DEFAULT 'free';
    END IF;
    
    -- Add logo_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE profiles ADD COLUMN logo_url text;
    END IF;
    
    -- Add full_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN full_name text;
    END IF;
    
    -- Add subscription_expires_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'subscription_expires_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN subscription_expires_at timestamptz;
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Create simple, non-recursive RLS policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.has_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile_safe(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_admin_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_tier(uuid) TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
