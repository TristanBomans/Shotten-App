-- ============================================================================
-- MIGRATION: Web Push subscriptions, outbox and dedupe
-- Run this in your Supabase SQL Editor
--
-- The PWA API routes write subscriptions; shotten-backend-node queues and
-- sends reminders. RLS is on without policies, so only the service key can
-- read or write these tables (push endpoints are private to the device).
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    player_id INTEGER REFERENCES core_players(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_player_id
ON push_subscriptions(player_id);

CREATE TABLE IF NOT EXISTS push_outbox (
    id BIGSERIAL PRIMARY KEY,
    endpoint TEXT NOT NULL REFERENCES push_subscriptions(endpoint) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT,
    tag TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    send_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_outbox_send_at
ON push_outbox(send_at);

-- One reminder of each kind per player per match.
CREATE TABLE IF NOT EXISTS push_sent (
    player_id INTEGER NOT NULL,
    match_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (player_id, match_id, kind)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_sent ENABLE ROW LEVEL SECURITY;
