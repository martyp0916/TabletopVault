-- Add sort_order field to collections table for drag-and-drop reordering
ALTER TABLE collections
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Set initial sort order based on created_at for existing collections
UPDATE collections
SET sort_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as row_num
  FROM collections
) AS subquery
WHERE collections.id = subquery.id AND collections.sort_order = 0;

COMMENT ON COLUMN collections.sort_order IS 'Order for displaying collections (lower numbers appear first)';
