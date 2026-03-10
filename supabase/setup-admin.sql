-- ============================================
-- Master Admin Account Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add email column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Step 2: Create/Update the admin user
-- Note: Supabase Auth requires email, so we use admin@tomato.local as the email

-- First, check if admin user exists and delete if needed (to reset password)
DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- Find existing admin by email in auth.users
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@tomato.local';

  IF admin_id IS NOT NULL THEN
    -- Delete profile first (due to foreign key)
    DELETE FROM profiles WHERE id = admin_id;
    -- Delete the auth user
    DELETE FROM auth.users WHERE id = admin_id;
  END IF;
END $$;

-- Step 3: Create the admin user in auth.users
-- Using Supabase's built-in function to create user with password
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@tomato.local',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Step 4: Create the profile record with name "Admin"
INSERT INTO profiles (id, name, email, role, created_at, updated_at)
SELECT
  id,
  'Admin',
  'admin@tomato.local',
  'admin',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'admin@tomato.local';

-- Step 5: Create identities record (required for auth to work)
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  id,
  id,
  'admin@tomato.local',
  json_build_object('sub', id::text, 'email', 'admin@tomato.local'),
  'email',
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'admin@tomato.local';

-- Step 6: Create session for the user
INSERT INTO auth.sessions (
  id,
  user_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  id,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'admin@tomato.local';

-- Step 7: Grant the user access
INSERT INTO auth.users (
  SELECT * FROM auth.users WHERE email = 'admin@tomato.local'
) ON CONFLICT DO NOTHING;

-- ============================================
-- Done! Admin account created:
-- Username: Admin
-- Email: admin@tomato.local
-- Password: admin123
-- ============================================

-- Verify the setup
SELECT
  u.email,
  p.name,
  p.role,
  p.email as profile_email
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'admin@tomato.local';
