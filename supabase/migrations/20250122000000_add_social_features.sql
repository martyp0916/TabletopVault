-- ============================================================================
-- SOCIAL FEATURES MIGRATION
-- Adds: follows, activities, comments, likes tables
-- Updates: profiles, items, collections with social fields
-- ============================================================================

-- 1. Update profiles table to support public profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- 2. Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- 3. Create activities table for activity feed
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT CHECK (activity_type IN (
    'item_added', 'item_updated', 'item_painted',
    'collection_created', 'collection_updated',
    'started_following'
  )) NOT NULL,
  target_item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  target_collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);

-- 4. Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT comment_target CHECK (
    (item_id IS NOT NULL AND collection_id IS NULL) OR
    (item_id IS NULL AND collection_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_comments_item ON comments(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_collection ON comments(collection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

-- 5. Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT like_target CHECK (
    (item_id IS NOT NULL AND collection_id IS NULL) OR
    (item_id IS NULL AND collection_id IS NOT NULL)
  )
);

-- Unique constraints for one like per user per target
CREATE UNIQUE INDEX IF NOT EXISTS unique_item_like ON likes(user_id, item_id) WHERE item_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_collection_like ON likes(user_id, collection_id) WHERE collection_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_likes_item ON likes(item_id);
CREATE INDEX IF NOT EXISTS idx_likes_collection ON likes(collection_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);

-- 6. Add like/comment counts to items and collections (denormalized for performance)
ALTER TABLE items ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- PROFILES - Add policy for viewing public profiles
CREATE POLICY "Users can view public profiles" ON profiles
  FOR SELECT USING (is_public = TRUE);

-- FOLLOWS POLICIES
CREATE POLICY "Anyone can view follows" ON follows
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can create follows" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ACTIVITIES POLICIES
CREATE POLICY "Users can view own activities" ON activities
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view public activities from public profiles" ON activities
  FOR SELECT USING (
    is_public = TRUE AND
    EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND is_public = TRUE)
  );

CREATE POLICY "Users can view activities from followed users" ON activities
  FOR SELECT USING (
    is_public = TRUE AND
    EXISTS (SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = user_id)
  );

CREATE POLICY "Users can create own activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- COMMENTS POLICIES
CREATE POLICY "Users can view comments on own content" ON comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM items WHERE id = comments.item_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM collections WHERE id = comments.collection_id AND user_id = auth.uid()) OR
    user_id = auth.uid()
  );

CREATE POLICY "Users can view comments on public content" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN collections c ON i.collection_id = c.id
      WHERE i.id = comments.item_id AND c.is_public = TRUE
    ) OR
    EXISTS (SELECT 1 FROM collections WHERE id = comments.collection_id AND is_public = TRUE)
  );

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- LIKES POLICIES
CREATE POLICY "Anyone can view likes" ON likes
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can create likes" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER FUNCTIONS FOR DENORMALIZED COUNTS
-- ============================================================================

-- Follow count triggers
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.following_id;
    UPDATE profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_change ON follows;
CREATE TRIGGER on_follow_change
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_counts();

-- Like count triggers
CREATE OR REPLACE FUNCTION update_like_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.item_id IS NOT NULL THEN
      UPDATE items SET like_count = like_count + 1 WHERE id = NEW.item_id;
    ELSIF NEW.collection_id IS NOT NULL THEN
      UPDATE collections SET like_count = like_count + 1 WHERE id = NEW.collection_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.item_id IS NOT NULL THEN
      UPDATE items SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.item_id;
    ELSIF OLD.collection_id IS NOT NULL THEN
      UPDATE collections SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.collection_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change ON likes;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_like_counts();

-- Comment count triggers
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.item_id IS NOT NULL THEN
      UPDATE items SET comment_count = comment_count + 1 WHERE id = NEW.item_id;
    ELSIF NEW.collection_id IS NOT NULL THEN
      UPDATE collections SET comment_count = comment_count + 1 WHERE id = NEW.collection_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.item_id IS NOT NULL THEN
      UPDATE items SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.item_id;
    ELSIF OLD.collection_id IS NOT NULL THEN
      UPDATE collections SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.collection_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_change ON comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_counts();
