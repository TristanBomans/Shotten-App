-- ============================================================================
-- MIGRATION: Link app players (core_players) to LZV players (lzv_players)
-- Run this in your Supabase SQL Editor
--
-- Holds the lzvcup.be player id (lzv_players.external_id, also the
-- "playerId" in lzv_match_details lineups). NULL means "not set": the app
-- then falls back to matching by name within the player's LZV teams.
-- Set from Settings > Manage players > LZV links (hidden admin only).
-- ============================================================================

ALTER TABLE core_players
ADD COLUMN IF NOT EXISTS lzv_player_external_id INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_core_players_lzv_player_external_id
ON core_players(lzv_player_external_id)
WHERE lzv_player_external_id IS NOT NULL;
