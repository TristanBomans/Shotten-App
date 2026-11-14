-- ============================================================================
-- MIGRATION: Man of the match votes
-- Run this in your Supabase SQL Editor
--
-- One vote per player per match. Players who were Present vote for another
-- Present teammate; the PWA API routes check the voting window and write
-- with the service key. Votes are public to read, like attendance.
-- ============================================================================

CREATE TABLE IF NOT EXISTS motm_votes (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES core_matches(id) ON DELETE CASCADE,
    voter_player_id INTEGER NOT NULL REFERENCES core_players(id) ON DELETE CASCADE,
    voted_player_id INTEGER NOT NULL REFERENCES core_players(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, voter_player_id),
    CHECK (voter_player_id <> voted_player_id)
);

CREATE INDEX IF NOT EXISTS idx_motm_votes_match_id ON motm_votes(match_id);
CREATE INDEX IF NOT EXISTS idx_motm_votes_voted_player_id ON motm_votes(voted_player_id);

ALTER TABLE motm_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON motm_votes;
CREATE POLICY "Public read access" ON motm_votes FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_motm_votes_updated_at ON motm_votes;
CREATE TRIGGER update_motm_votes_updated_at BEFORE UPDATE ON motm_votes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
