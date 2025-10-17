-- Script to assign admin roles to specific users
-- Replace the email addresses below with the actual admin user emails

-- Example: Make specific users admins by their email
UPDATE profiles 
SET role = 'admin' 
WHERE email IN (
  'rdcpulldo@gmail.com',  -- Replace with actual admin email
  'admin@yourdomain.com'   -- Add more admin emails as needed
);

-- Alternative: Make the first registered user an admin
-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE created_at = (SELECT MIN(created_at) FROM profiles);

-- Verify admin assignments
SELECT email, role, created_at 
FROM profiles 
WHERE role = 'admin';
