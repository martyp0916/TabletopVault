-- Add is_complete and is_locked fields to collections table
-- is_complete: Marks a collection as fully painted/complete
-- is_locked: Prevents accidental additions or deletions to the collection

ALTER TABLE collections
ADD COLUMN is_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN collections.is_complete IS 'Indicates if the collection is marked as complete (all items painted)';
COMMENT ON COLUMN collections.is_locked IS 'Prevents additions or deletions to protect the collection from accidental changes';
