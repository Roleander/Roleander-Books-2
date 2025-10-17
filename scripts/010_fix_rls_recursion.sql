-- Fix infinite recursion in profiles RLS policies
-- The issue is that admin policies on profiles table query the same table

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create a safer approach using a function that bypasses RLS for admin checks
CREATE OR REPLACE FUNCTION public.check_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Use a direct query that bypasses RLS
    SELECT role INTO user_role FROM profiles WHERE id = user_id;
    RETURN COALESCE(user_role, 'user');
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_role(UUID) TO authenticated;

-- Create new admin policies that don't cause recursion
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        public.check_user_role(auth.uid()) = 'admin'
    );

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        public.check_user_role(auth.uid()) = 'admin'
    );

-- Also fix the bootstrap function to be more reliable
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_count INTEGER;
    user_id UUID;
BEGIN
    -- Check if any admins exist (bypass RLS)
    SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
    
    -- Only allow bootstrap if no admins exist
    IF admin_count = 0 THEN
        -- Find user by email from auth.users and join with profiles
        SELECT p.id INTO user_id 
        FROM profiles p
        JOIN auth.users u ON p.id = u.id 
        WHERE u.email = user_email;
        
        IF user_id IS NOT NULL THEN
            -- Make this user an admin
            UPDATE profiles SET role = 'admin' WHERE id = user_id;
            RETURN TRUE;
        END IF;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Create a function to safely check if any admins exist
CREATE OR REPLACE FUNCTION public.has_admin_users()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
    RETURN admin_count > 0;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_admin_users() TO authenticated;
