-- ============================================================================
-- MIGRATION: Link core teams/matches to LZV scraper ids
-- Run this in your Supabase SQL Editor
-- ============================================================================

ALTER TABLE core_teams
ADD COLUMN IF NOT EXISTS lzv_external_id INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_core_teams_lzv_external_id
ON core_teams(lzv_external_id)
WHERE lzv_external_id IS NOT NULL;

ALTER TABLE core_matches
ADD COLUMN IF NOT EXISTS lzv_match_external_id TEXT;

ALTER TABLE core_matches
ADD COLUMN IF NOT EXISTS opponent_lzv_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_core_matches_lzv_match
ON core_matches(lzv_match_external_id);

ALTER TABLE lzv_matches
ADD COLUMN IF NOT EXISTS home_team_id INTEGER;

ALTER TABLE lzv_matches
ADD COLUMN IF NOT EXISTS away_team_id INTEGER;

UPDATE core_teams
SET lzv_external_id = 1319
WHERE lzv_external_id IS NULL
  AND lower(name) LIKE '%wille ma ni kunne%';

SELECT 'core_teams' AS table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'core_teams'
UNION ALL
SELECT 'core_matches', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'core_matches'
  AND column_name IN ('lzv_match_external_id', 'opponent_lzv_id')
UNION ALL
SELECT 'lzv_matches', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'lzv_matches'
  AND column_name IN ('home_team_id', 'away_team_id')
ORDER BY table_name, column_name;
