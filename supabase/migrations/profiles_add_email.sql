-- ============================================
-- Quick Admin Setup Script
-- Run this in Supabase SQL Editor to:
-- 1. Add email column to profiles table
-- 2. Create master admin account
-- ============================================

-- Add email column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create a function to handle new user signup (auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'staff',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Create Admin User (run this section)
-- ============================================

-- Simple approach: Use Supabase's admin API to create user
-- Since direct auth.users insert is complex, here's an alternative:

-- Option A: Call this from your app after first login
-- Or Option B: Sign up via the app with:
--   Email: admin@tomato.local
--   Name: Admin
--   Password: admin123
-- Then run this to make them admin:

-- UPDATE profiles SET role = 'admin', email = 'admin@tomato.local'
-- WHERE name = 'Admin');

-- ============================================
-- If you want to create admin directly, run:
-- ============================================

DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'admin@tomato.local',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin"}',
    NOW(), NOW(), '', '', '', ''
  );

  -- Create profile
  INSERT INTO profiles (id, name, email, role, created_at, updated_at)
  VALUES (new_user_id, 'Admin', 'admin@tomato.local', 'admin', NOW(), NOW());

  -- Create identity
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  VALUES (
    new_user_id, new_user_id, 'admin@tomato.local',
    json_build_object('sub', new_user_id::text, 'email', 'admin@tomato.local'),
    'email', NOW(), NOW()
  );

  RAISE NOTICE 'Admin user created with ID: %', new_user_id;
END $$;

-- Verify
SELECT u.email, p.name, p.role FROM auth.users u
JOIN profiles p ON p.id = u.id WHERE u.email = 'admin@tomato.local';
