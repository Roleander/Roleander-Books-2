-- Ensure the role column exists and set up initial admin
-- This script can be run multiple times safely

-- Add role column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
        
        -- Create index for role queries
        CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
        
        -- Update RLS policies for role-based access
        DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
        DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
        DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
        
        -- Recreate policies with role support
        CREATE POLICY "Users can view own profile" ON profiles
            FOR SELECT USING (auth.uid() = id);
            
        CREATE POLICY "Users can update own profile" ON profiles
            FOR UPDATE USING (auth.uid() = id);
            
        CREATE POLICY "Admins can view all profiles" ON profiles
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
            
        CREATE POLICY "Admins can update all profiles" ON profiles
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- Ensure there's at least one way to bootstrap admin access
-- This creates a temporary function that can be used once
CREATE OR REPLACE FUNCTION bootstrap_first_admin(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_count INTEGER;
    user_id UUID;
BEGIN
    -- Check if any admins exist
    SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
    
    -- Only allow bootstrap if no admins exist
    IF admin_count = 0 THEN
        -- Find user by email
        SELECT id INTO user_id FROM profiles 
        JOIN auth.users ON profiles.id = auth.users.id 
        WHERE auth.users.email = user_email;
        
        IF user_id IS NOT NULL THEN
            -- Make this user an admin
            UPDATE profiles SET role = 'admin' WHERE id = user_id;
            RETURN TRUE;
        END IF;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION bootstrap_first_admin(TEXT) TO authenticated;
