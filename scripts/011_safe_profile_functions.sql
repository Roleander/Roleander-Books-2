-- Create safe functions to get user profile data without RLS recursion

-- Function to safely get user subscription tier
CREATE OR REPLACE FUNCTION public.get_user_subscription_tier(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tier TEXT;
BEGIN
    -- Use a direct query that bypasses RLS
    SELECT subscription_tier INTO tier FROM profiles WHERE id = user_id;
    RETURN COALESCE(tier, 'free');
END;
$$;

-- Function to safely get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_subscription_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
