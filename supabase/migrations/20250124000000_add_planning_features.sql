-- Planning Features Migration
-- Adds paint queue and painting goals tables

-- Paint Queue Table
-- Stores items users want to paint next, with priority ordering
CREATE TABLE IF NOT EXISTS paint_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate items in queue
  UNIQUE(user_id, item_id)
);

-- Painting Goals Table
-- Stores user-defined painting goals with optional deadlines
CREATE TABLE IF NOT EXISTS painting_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('models_painted', 'items_completed', 'custom')),
  target_count INTEGER NOT NULL CHECK (target_count > 0),
  current_count INTEGER DEFAULT 0 CHECK (current_count >= 0),
  deadline DATE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_paint_queue_user_id ON paint_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_paint_queue_priority ON paint_queue(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_painting_goals_user_id ON painting_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_painting_goals_completed ON painting_goals(user_id, is_completed);

-- Enable RLS
ALTER TABLE paint_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE painting_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for paint_queue
-- Users can only see their own queue
CREATE POLICY "Users can view own paint queue"
  ON paint_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add to their own queue
CREATE POLICY "Users can add to own paint queue"
  ON paint_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own queue items
CREATE POLICY "Users can update own paint queue"
  ON paint_queue FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can remove from their own queue
CREATE POLICY "Users can delete from own paint queue"
  ON paint_queue FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for painting_goals
-- Users can only see their own goals
CREATE POLICY "Users can view own painting goals"
  ON painting_goals FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own goals
CREATE POLICY "Users can create own painting goals"
  ON painting_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own goals
CREATE POLICY "Users can update own painting goals"
  ON painting_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own goals
CREATE POLICY "Users can delete own painting goals"
  ON painting_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at on painting_goals
CREATE OR REPLACE FUNCTION update_painting_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER painting_goals_updated_at
  BEFORE UPDATE ON painting_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_painting_goals_updated_at();

-- Trigger to auto-set completed_at when goal is marked complete
CREATE OR REPLACE FUNCTION set_goal_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
    NEW.completed_at = NOW();
  ELSIF NEW.is_completed = FALSE THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER painting_goals_completed_at
  BEFORE UPDATE ON painting_goals
  FOR EACH ROW
  EXECUTE FUNCTION set_goal_completed_at();
