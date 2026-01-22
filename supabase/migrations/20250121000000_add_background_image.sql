-- Add background_image_url column to profiles table
-- This allows users to set a custom background image for the app

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS background_image_url TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.background_image_url IS 'Path to user custom background image in profile-images storage bucket';
