-- ============================================================================
-- MIGRATION: LZV match details (lineups, goals, assists per match)
-- Run this in your Supabase SQL Editor BEFORE deploying the scraper worker
-- that writes lzv_matches.lzv_result_id.
--
-- Additive only: one nullable column and one new table. Safe to re-run.
-- ============================================================================

-- Id of lzvcup.be/results/detail/{id}; only set once a match has a result page.
ALTER TABLE lzv_matches
ADD COLUMN IF NOT EXISTS lzv_result_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_lzv_matches_result_id
ON lzv_matches(lzv_result_id);

-- One row per result page. Lineups are JSON arrays of
-- { "playerId": 13175, "name": "...", "number": 6, "captain": false, "goals": 1, "assists": 0 }
CREATE TABLE IF NOT EXISTS lzv_match_details (
    result_id INTEGER PRIMARY KEY,
    date TIMESTAMPTZ,
    location TEXT,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_team_id INTEGER,
    away_team_id INTEGER,
    home_score INTEGER,
    away_score INTEGER,
    home_lineup JSONB NOT NULL DEFAULT '[]'::jsonb,
    away_lineup JSONB NOT NULL DEFAULT '[]'::jsonb,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lzv_match_details ENABLE ROW LEVEL SECURITY;

-- Read-only for the app. The worker writes with the service role key, which
-- bypasses RLS, so no write policy is needed.
DROP POLICY IF EXISTS "Public read access" ON lzv_match_details;
CREATE POLICY "Public read access" ON lzv_match_details FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_lzv_match_details_updated_at ON lzv_match_details;
CREATE TRIGGER update_lzv_match_details_updated_at BEFORE UPDATE ON lzv_match_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify
SELECT 'lzv_matches' AS table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'lzv_matches' AND column_name = 'lzv_result_id'
UNION ALL
SELECT 'lzv_match_details', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'lzv_match_details'
ORDER BY table_name, column_name;
