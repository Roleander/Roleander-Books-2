-- Force admin setup for troubleshooting
-- This script ensures the first user becomes admin and fixes any role issues

-- First, let's make sure we have the necessary functions
CREATE OR REPLACE FUNCTION public.force_user_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_user_id uuid;
    profile_exists boolean;
BEGIN
    -- Get user ID from email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User with email % not found', user_email;
        RETURN false;
    END IF;
    
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = target_user_id) INTO profile_exists;
    
    IF NOT profile_exists THEN
        -- Create profile with admin role
        INSERT INTO profiles (id, role, subscription_tier, full_name)
        VALUES (target_user_id, 'admin', 'premium', 'Admin User')
        ON CONFLICT (id) DO UPDATE SET 
            role = 'admin',
            subscription_tier = 'premium';
    ELSE
        -- Update existing profile to admin
        UPDATE profiles 
        SET role = 'admin', subscription_tier = 'premium'
        WHERE id = target_user_id;
    END IF;
    
    RAISE NOTICE 'User % (%) set as admin', user_email, target_user_id;
    RETURN true;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error setting user as admin: %', SQLERRM;
        RETURN false;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.force_user_admin(text) TO authenticated;

-- Also create a function to check all users and their roles
CREATE OR REPLACE FUNCTION public.debug_user_roles()
RETURNS TABLE(user_id uuid, email text, role text, subscription_tier text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        u.email,
        COALESCE(p.role, 'no_role') as role,
        COALESCE(p.subscription_tier, 'no_tier') as subscription_tier,
        COALESCE(p.full_name, 'no_name') as full_name
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    ORDER BY u.created_at;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.debug_user_roles() TO authenticated;

-- Make sure the first registered user is admin
DO $$
DECLARE
    first_user_id uuid;
    first_user_email text;
BEGIN
    -- Get the first user (oldest by creation date)
    SELECT id, email INTO first_user_id, first_user_email
    FROM auth.users
    ORDER BY created_at
    LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Ensure this user has admin role
        INSERT INTO profiles (id, role, subscription_tier, full_name)
        VALUES (first_user_id, 'admin', 'premium', 'Admin User')
        ON CONFLICT (id) DO UPDATE SET 
            role = 'admin',
            subscription_tier = 'premium';
            
        RAISE NOTICE 'Set first user % as admin', first_user_email;
    END IF;
END $$;
