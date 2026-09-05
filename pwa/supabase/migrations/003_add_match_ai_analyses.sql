-- ============================================================================
-- MIGRATION: Persist opponent AI analyses per match
-- Run this in your Supabase SQL Editor
-- ============================================================================

CREATE TABLE IF NOT EXISTS match_ai_analyses (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES core_matches(id) ON DELETE CASCADE,
    analysis TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id)
);

CREATE INDEX IF NOT EXISTS idx_match_ai_analyses_match_id
ON match_ai_analyses(match_id);

ALTER TABLE match_ai_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON match_ai_analyses;
CREATE POLICY "Public read access" ON match_ai_analyses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access" ON match_ai_analyses;
CREATE POLICY "Service role full access" ON match_ai_analyses FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_match_ai_analyses_updated_at ON match_ai_analyses;
CREATE TRIGGER update_match_ai_analyses_updated_at BEFORE UPDATE ON match_ai_analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
