-- ============================================================================
-- MIGRATION: Add forfait column to core_matches
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- Add forfait boolean column (default FALSE so existing matches are not forfait)
ALTER TABLE core_matches
ADD COLUMN IF NOT EXISTS forfait BOOLEAN DEFAULT FALSE;

-- Optional: Add index if you plan to filter on forfait often
CREATE INDEX IF NOT EXISTS idx_core_matches_forfait ON core_matches(forfait);

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'core_matches'
ORDER BY ordinal_position;
