-- ============================================================================
-- SHOTTEN APP - SUPABASE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- ============================================================================
-- CORE TABLES (App functionality - attendance tracking)
-- ============================================================================

-- Core Teams (Wille ma ni kunne, FC Degradé)
CREATE TABLE IF NOT EXISTS core_teams (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    lzv_external_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core Players (team members)
CREATE TABLE IF NOT EXISTS core_players (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    team_ids INTEGER[] DEFAULT '{}',
    lzv_player_external_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core Matches (from iCal sync)
CREATE TABLE IF NOT EXISTS core_matches (
    id SERIAL PRIMARY KEY,
    date TIMESTAMPTZ NOT NULL,
    location TEXT,
    name TEXT,
    team_name TEXT,
    team_id INTEGER REFERENCES core_teams(id),
    forfait BOOLEAN DEFAULT FALSE,
    lzv_match_external_id TEXT,
    opponent_lzv_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance (player attendance per match)
CREATE TABLE IF NOT EXISTS attendances (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES core_matches(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES core_players(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'NotPresent' CHECK (status IN ('Present', 'NotPresent', 'Maybe')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, player_id)
);

-- Persisted AI opponent scouting report (one current report per match)
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

-- ============================================================================
-- LZV SCRAPER TABLES (League data from lzvcup.be)
-- ============================================================================

-- LZV Teams (all teams in the league)
CREATE TABLE IF NOT EXISTS lzv_teams (
    id SERIAL PRIMARY KEY,
    external_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    league_id INTEGER,
    league_name TEXT,
    rank INTEGER,
    points INTEGER DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    goal_difference INTEGER DEFAULT 0,
    points_per_match DECIMAL(4,2) DEFAULT 0,
    form TEXT[] DEFAULT '{}',
    colors TEXT,
    manager TEXT,
    description TEXT,
    image_base64 TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LZV Matches (scraped match results)
CREATE TABLE IF NOT EXISTS lzv_matches (
    id SERIAL PRIMARY KEY,
    external_id TEXT UNIQUE NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    location TEXT,
    team_id INTEGER NOT NULL,
    home_team_id INTEGER,
    away_team_id INTEGER,
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Played', 'Postponed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LZV Players (scraped player stats)
CREATE TABLE IF NOT EXISTS lzv_players (
    id SERIAL PRIMARY KEY,
    external_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LZV Player Team Stats (stats per player per team - supports multi-team players)
CREATE TABLE IF NOT EXISTS lzv_player_team_stats (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES lzv_players(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL,
    jersey_number INTEGER,
    games_played INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    fairplay_rank INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, team_id)
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_attendances_match_id ON attendances(match_id);
CREATE INDEX IF NOT EXISTS idx_attendances_player_id ON attendances(player_id);
CREATE INDEX IF NOT EXISTS idx_match_ai_analyses_match_id ON match_ai_analyses(match_id);
CREATE INDEX IF NOT EXISTS idx_core_matches_team_id ON core_matches(team_id);
CREATE INDEX IF NOT EXISTS idx_core_matches_date ON core_matches(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_core_teams_lzv_external_id ON core_teams(lzv_external_id) WHERE lzv_external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_matches_lzv_match ON core_matches(lzv_match_external_id);
CREATE INDEX IF NOT EXISTS idx_lzv_matches_team_id ON lzv_matches(team_id);
CREATE INDEX IF NOT EXISTS idx_lzv_matches_date ON lzv_matches(date);
CREATE INDEX IF NOT EXISTS idx_lzv_teams_external_id ON lzv_teams(external_id);
CREATE INDEX IF NOT EXISTS idx_lzv_players_external_id ON lzv_players(external_id);
CREATE INDEX IF NOT EXISTS idx_lzv_player_team_stats_team_id ON lzv_player_team_stats(team_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS but allow public read access, authenticated write access
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE core_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lzv_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE lzv_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE lzv_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE lzv_player_team_stats ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read access" ON core_teams FOR SELECT USING (true);
CREATE POLICY "Public read access" ON core_players FOR SELECT USING (true);
CREATE POLICY "Public read access" ON core_matches FOR SELECT USING (true);
CREATE POLICY "Public read access" ON attendances FOR SELECT USING (true);
CREATE POLICY "Public read access" ON match_ai_analyses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON lzv_teams FOR SELECT USING (true);
CREATE POLICY "Public read access" ON lzv_matches FOR SELECT USING (true);
CREATE POLICY "Public read access" ON lzv_players FOR SELECT USING (true);
CREATE POLICY "Public read access" ON lzv_player_team_stats FOR SELECT USING (true);

-- No write policies: the service key bypasses RLS, and all writes go through it.

-- ============================================================================
-- FUNCTIONS for auto-updating timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_core_teams_updated_at BEFORE UPDATE ON core_teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_core_players_updated_at BEFORE UPDATE ON core_players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_core_matches_updated_at BEFORE UPDATE ON core_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendances_updated_at BEFORE UPDATE ON attendances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_ai_analyses_updated_at BEFORE UPDATE ON match_ai_analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lzv_matches_updated_at BEFORE UPDATE ON lzv_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lzv_player_team_stats_updated_at BEFORE UPDATE ON lzv_player_team_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LZV MATCH DETAILS (migration 004)
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

-- ============================================================================
-- MAN OF THE MATCH VOTES (migration 008)
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

-- ============================================================================
-- ABSENCE PERIODS (migration 010)
--
-- A player marks "away from .. to .." once; every future match of their teams
-- in that range gets NotPresent, marked via attendances.auto_absence_id.
-- The core_matches trigger covers matches the backend iCal sync adds later.
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_absences (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES core_players(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT player_absences_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_player_absences_player_dates
ON player_absences(player_id, start_date, end_date);

ALTER TABLE player_absences ENABLE ROW LEVEL SECURITY;

-- Public read, like attendances. Writes go through the service key.
DROP POLICY IF EXISTS "Public read access" ON player_absences;
CREATE POLICY "Public read access" ON player_absences FOR SELECT USING (true);

DROP TRIGGER IF EXISTS update_player_absences_updated_at ON player_absences;
CREATE TRIGGER update_player_absences_updated_at BEFORE UPDATE ON player_absences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Marker for answers set automatically by an absence. Deleting the absence
-- keeps the answer but turns it into a normal one (SET NULL).
ALTER TABLE attendances
ADD COLUMN IF NOT EXISTS auto_absence_id INTEGER REFERENCES player_absences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_attendances_auto_absence_id
ON attendances(auto_absence_id) WHERE auto_absence_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- A manual answer clears the marker. Fires when an UPDATE sets status
-- (the app's attendance upsert always does). Updates that set the marker
-- themselves (the apply function) keep it.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION clear_attendance_auto_absence()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.auto_absence_id IS NOT NULL
       AND NEW.auto_absence_id IS NOT DISTINCT FROM OLD.auto_absence_id THEN
        NEW.auto_absence_id := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clear_attendances_auto_absence ON attendances;
CREATE TRIGGER clear_attendances_auto_absence BEFORE UPDATE OF status ON attendances
    FOR EACH ROW EXECUTE FUNCTION clear_attendance_auto_absence();

-- ----------------------------------------------------------------------------
-- New (or rescheduled) matches: auto-decline players who are away that day.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_player_absences_to_match()
RETURNS TRIGGER AS $$
DECLARE
    match_day DATE := (NEW.date AT TIME ZONE 'Europe/Brussels')::date;
BEGIN
    IF TG_OP = 'UPDATE'
       AND NEW.date IS NOT DISTINCT FROM OLD.date
       AND NEW.team_id IS NOT DISTINCT FROM OLD.team_id THEN
        RETURN NEW;
    END IF;

    IF NEW.date <= NOW() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Moved out of someone's away period: auto answers go back to "no response".
        DELETE FROM attendances att
        WHERE att.match_id = NEW.id
          AND att.auto_absence_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM player_absences a
              JOIN core_players p ON p.id = a.player_id
              WHERE a.player_id = att.player_id
                AND NEW.team_id = ANY(p.team_ids)
                AND match_day BETWEEN a.start_date AND a.end_date
          );
    END IF;

    IF NEW.team_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO attendances (match_id, player_id, status, auto_absence_id)
    SELECT DISTINCT ON (a.player_id) NEW.id, a.player_id, 'NotPresent', a.id
    FROM player_absences a
    JOIN core_players p ON p.id = a.player_id
    WHERE NEW.team_id = ANY(p.team_ids)
      AND match_day BETWEEN a.start_date AND a.end_date
    ORDER BY a.player_id, a.id
    ON CONFLICT (match_id, player_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS apply_player_absences_on_core_matches ON core_matches;
CREATE TRIGGER apply_player_absences_on_core_matches
    AFTER INSERT OR UPDATE OF date, team_id ON core_matches
    FOR EACH ROW EXECUTE FUNCTION apply_player_absences_to_match();

-- ----------------------------------------------------------------------------
-- Apply one absence to existing future matches (after create or edit).
-- * no answer / Maybe  -> NotPresent, marked as auto
-- * Present / NotPresent set by hand -> untouched
-- * auto answers of this absence that fell out of its range (edit) -> moved to
--   another covering absence, or back to "no response"
-- Returns how many matches were newly marked.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_player_absence(p_absence_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    ab player_absences%ROWTYPE;
    inserted INTEGER := 0;
    updated INTEGER := 0;
BEGIN
    SELECT * INTO ab FROM player_absences WHERE id = p_absence_id;
    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Stale auto answers: re-point to another absence that still covers them...
    UPDATE attendances att
    SET auto_absence_id = other.id
    FROM core_matches m, player_absences other
    WHERE att.auto_absence_id = ab.id
      AND m.id = att.match_id
      AND m.date > NOW()
      AND (m.date AT TIME ZONE 'Europe/Brussels')::date NOT BETWEEN ab.start_date AND ab.end_date
      AND other.player_id = ab.player_id
      AND other.id <> ab.id
      AND (m.date AT TIME ZONE 'Europe/Brussels')::date BETWEEN other.start_date AND other.end_date;

    -- ...or drop them (back to "no response").
    DELETE FROM attendances att
    USING core_matches m
    WHERE att.auto_absence_id = ab.id
      AND m.id = att.match_id
      AND m.date > NOW()
      AND (m.date AT TIME ZONE 'Europe/Brussels')::date NOT BETWEEN ab.start_date AND ab.end_date;

    -- Matches in range without an answer.
    INSERT INTO attendances (match_id, player_id, status, auto_absence_id)
    SELECT m.id, ab.player_id, 'NotPresent', ab.id
    FROM core_matches m
    JOIN core_players p ON p.id = ab.player_id
    WHERE m.team_id = ANY(p.team_ids)
      AND m.date > NOW()
      AND (m.date AT TIME ZONE 'Europe/Brussels')::date BETWEEN ab.start_date AND ab.end_date
    ON CONFLICT (match_id, player_id) DO NOTHING;
    GET DIAGNOSTICS inserted = ROW_COUNT;

    -- "Maybe" answers in range.
    UPDATE attendances att
    SET status = 'NotPresent', auto_absence_id = ab.id
    FROM core_matches m, core_players p
    WHERE att.player_id = ab.player_id
      AND att.status = 'Maybe'
      AND m.id = att.match_id
      AND p.id = ab.player_id
      AND m.team_id = ANY(p.team_ids)
      AND m.date > NOW()
      AND (m.date AT TIME ZONE 'Europe/Brussels')::date BETWEEN ab.start_date AND ab.end_date;
    GET DIAGNOSTICS updated = ROW_COUNT;

    RETURN inserted + updated;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Delete one absence. Future auto answers still covered by another absence
-- move to it. With p_reset the rest go back to "no response"; without it they
-- stay NotPresent as normal answers (the FK sets the marker to NULL).
-- Returns how many answers were reset.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION remove_player_absence(p_absence_id INTEGER, p_reset BOOLEAN)
RETURNS INTEGER AS $$
DECLARE
    ab player_absences%ROWTYPE;
    reset_count INTEGER := 0;
BEGIN
    SELECT * INTO ab FROM player_absences WHERE id = p_absence_id;
    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    UPDATE attendances att
    SET auto_absence_id = other.id
    FROM core_matches m, player_absences other
    WHERE att.auto_absence_id = ab.id
      AND m.id = att.match_id
      AND m.date > NOW()
      AND other.player_id = ab.player_id
      AND other.id <> ab.id
      AND (m.date AT TIME ZONE 'Europe/Brussels')::date BETWEEN other.start_date AND other.end_date;

    IF p_reset THEN
        DELETE FROM attendances att
        USING core_matches m
        WHERE att.auto_absence_id = ab.id
          AND m.id = att.match_id
          AND m.date > NOW();
        GET DIAGNOSTICS reset_count = ROW_COUNT;
    END IF;

    DELETE FROM player_absences WHERE id = ab.id;
    RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- Only the service key may call these through PostgREST. (They run as the
-- caller, so anon could not write anyway: attendances has no write policy.)
REVOKE ALL ON FUNCTION apply_player_absence(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION remove_player_absence(INTEGER, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION apply_player_absence(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION remove_player_absence(INTEGER, BOOLEAN) TO service_role;
