-- ============================================================================
-- MIGRATION: Drop the "Service role full access" policies
-- Run this in your Supabase SQL Editor
--
-- Those policies had no role, so they applied to everyone, including the
-- public anon key shipped to the browser: anyone could write any table.
-- The service key bypasses RLS on its own, and every write already goes
-- through the PWA API routes or shotten-backend-node with that key.
-- Public read access stays.
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access" ON core_teams;
DROP POLICY IF EXISTS "Service role full access" ON core_players;
DROP POLICY IF EXISTS "Service role full access" ON core_matches;
DROP POLICY IF EXISTS "Service role full access" ON attendances;
DROP POLICY IF EXISTS "Service role full access" ON match_ai_analyses;
DROP POLICY IF EXISTS "Service role full access" ON lzv_teams;
DROP POLICY IF EXISTS "Service role full access" ON lzv_matches;
DROP POLICY IF EXISTS "Service role full access" ON lzv_players;
DROP POLICY IF EXISTS "Service role full access" ON lzv_player_team_stats;
