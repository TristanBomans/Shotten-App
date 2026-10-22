-- ============================================================================
-- MIGRATION: Mark admin devices on push_subscriptions
-- Run this in your Supabase SQL Editor
--
-- Devices with the hidden admin page unlocked get admin pushes from
-- shotten-backend-node, e.g. when a new LZV score starts a scrape.
-- ============================================================================

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS admin BOOLEAN NOT NULL DEFAULT FALSE;
