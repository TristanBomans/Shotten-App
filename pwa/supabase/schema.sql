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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core Players (team members)
CREATE TABLE IF NOT EXISTS core_players (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    team_ids INTEGER[] DEFAULT '{}',
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
CREATE INDEX IF NOT EXISTS idx_core_matches_team_id ON core_matches(team_id);
CREATE INDEX IF NOT EXISTS idx_core_matches_date ON core_matches(date);
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
ALTER TABLE lzv_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE lzv_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE lzv_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE lzv_player_team_stats ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read access" ON core_teams FOR SELECT USING (true);
CREATE POLICY "Public read access" ON core_players FOR SELECT USING (true);
CREATE POLICY "Public read access" ON core_matches FOR SELECT USING (true);
CREATE POLICY "Public read access" ON attendances FOR SELECT USING (true);
CREATE POLICY "Public read access" ON lzv_teams FOR SELECT USING (true);
CREATE POLICY "Public read access" ON lzv_matches FOR SELECT USING (true);
CREATE POLICY "Public read access" ON lzv_players FOR SELECT USING (true);
CREATE POLICY "Public read access" ON lzv_player_team_stats FOR SELECT USING (true);

-- Service role can do everything (for scraper and API mutations)
CREATE POLICY "Service role full access" ON core_teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON core_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON core_matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON attendances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON lzv_teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON lzv_matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON lzv_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON lzv_player_team_stats FOR ALL USING (true) WITH CHECK (true);

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

CREATE TRIGGER update_lzv_matches_updated_at BEFORE UPDATE ON lzv_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lzv_player_team_stats_updated_at BEFORE UPDATE ON lzv_player_team_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
