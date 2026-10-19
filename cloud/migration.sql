-- Apply once to a Cloudflare D1 database before enabling the HUB_DB binding.
-- All records are private. Do not commit students' actual progress JSON.
CREATE TABLE IF NOT EXISTS hub_state (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 revision INTEGER NOT NULL DEFAULT 0,
 data_json TEXT,
 updated_at TEXT
);
CREATE TABLE IF NOT EXISTS hub_backups (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 revision INTEGER NOT NULL,
 data_json TEXT NOT NULL,
 saved_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hub_backups_saved_at ON hub_backups(saved_at);
