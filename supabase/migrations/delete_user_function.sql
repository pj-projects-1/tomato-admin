-- ============================================
-- Delete User Function
-- Allows admins to delete users securely
-- ============================================

-- Create a function to delete users (admin only)
CREATE OR REPLACE FUNCTION public.delete_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
  target_role TEXT;
  admin_count INTEGER;
  caller_id UUID;
BEGIN
  -- Get the caller's ID and role
  caller_id := auth.uid();

  IF caller_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Get caller's role
  SELECT role INTO caller_role FROM profiles WHERE id = caller_id;

  IF caller_role IS NULL OR caller_role != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only administrators can delete users'
    );
  END IF;

  -- Cannot delete yourself
  IF caller_id = target_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete your own account'
    );
  END IF;

  -- Get target user's role
  SELECT role INTO target_role FROM profiles WHERE id = target_user_id;

  IF target_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Cannot delete the last admin
  IF target_role = 'admin' THEN
    SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
    IF admin_count <= 1 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cannot delete the last administrator'
      );
    END IF;
  END IF;

  -- Delete the profile first
  DELETE FROM profiles WHERE id = target_user_id;

  -- Delete the auth user
  -- Note: This requires the service role, but we can mark the user as deleted
  -- by updating their metadata or we rely on cascade

  -- For Supabase, we need to use auth.users delete which requires service role
  -- Instead, we'll disable the user by updating their email and metadata
  UPDATE auth.users
  SET
    email = 'deleted_' || gen_random_uuid()::text || '@deleted.local',
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{deleted_at}',
      to_jsonb(to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    ),
    email_confirmed_at = NULL,
    banned_until = '2999-12-31 23:59:59'::timestamptz
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User deleted successfully'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.delete_user(UUID) IS
'Allows administrators to delete user accounts. The profile is deleted and the auth user is disabled.';
