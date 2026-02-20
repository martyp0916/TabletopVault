-- ============================================================================
-- SECURITY FIXES MIGRATION
-- Addresses Supabase Security Advisor warnings:
-- 1. Function Search Path Mutable - Add search_path to all trigger functions
-- 2. RLS Policy Always True - Fix overly permissive profiles policy
-- ============================================================================

-- ============================================================================
-- FIX 1: Function Search Path Mutable
-- Recreate all trigger functions with SET search_path = '' to prevent
-- search path injection attacks
-- ============================================================================

-- Fix: update_painting_goals_updated_at
CREATE OR REPLACE FUNCTION update_painting_goals_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix: set_goal_completed_at
CREATE OR REPLACE FUNCTION set_goal_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
    NEW.completed_at = NOW();
  ELSIF NEW.is_completed = FALSE THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: update_wishlist_updated_at
CREATE OR REPLACE FUNCTION update_wishlist_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix: update_follow_counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.following_id;
    UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix: update_like_counts
CREATE OR REPLACE FUNCTION update_like_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.item_id IS NOT NULL THEN
      UPDATE public.items SET like_count = like_count + 1 WHERE id = NEW.item_id;
    ELSIF NEW.collection_id IS NOT NULL THEN
      UPDATE public.collections SET like_count = like_count + 1 WHERE id = NEW.collection_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.item_id IS NOT NULL THEN
      UPDATE public.items SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.item_id;
    ELSIF OLD.collection_id IS NOT NULL THEN
      UPDATE public.collections SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.collection_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix: update_comment_counts
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.item_id IS NOT NULL THEN
      UPDATE public.items SET comment_count = comment_count + 1 WHERE id = NEW.item_id;
    ELSIF NEW.collection_id IS NOT NULL THEN
      UPDATE public.collections SET comment_count = comment_count + 1 WHERE id = NEW.collection_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.item_id IS NOT NULL THEN
      UPDATE public.items SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.item_id;
    ELSIF OLD.collection_id IS NOT NULL THEN
      UPDATE public.collections SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.collection_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix: handle_new_user (from initial schema)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- ============================================================================
-- FIX 2: RLS Policy Always True on profiles
-- The "Users can view public profiles" policy allows anyone to see profiles
-- where is_public = TRUE. This is intentional but we can make it more specific
-- by requiring authentication.
-- ============================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view public profiles" ON profiles;

-- Recreate with authenticated user requirement
-- Public profiles can be viewed by any authenticated user
CREATE POLICY "Authenticated users can view public profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (is_public = TRUE OR auth.uid() = id);

-- ============================================================================
-- Note: "Leaked Password Protection Disabled" must be fixed in Supabase Dashboard
-- Go to: Authentication > Settings > Security > Enable "Leaked password protection"
-- ============================================================================
