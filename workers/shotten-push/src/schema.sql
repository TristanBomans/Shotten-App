CREATE TABLE IF NOT EXISTS subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  player_id INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  tag TEXT,
  send_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_send_at ON outbox(send_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_player ON subscriptions(player_id);

CREATE TABLE IF NOT EXISTS sent (
  player_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, match_id, kind)
);
