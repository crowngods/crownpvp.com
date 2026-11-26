CREATE TABLE IF NOT EXISTS punishments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('ban','kick','mute','warn')),
  ext_id TEXT NOT NULL,
  uuid TEXT NOT NULL,
  name TEXT NOT NULL,
  staff TEXT NOT NULL DEFAULT 'CONSOLE',
  reason TEXT NOT NULL DEFAULT '',
  time INTEGER NOT NULL,
  until INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 0,
  removed_by TEXT,
  UNIQUE (type, ext_id)
);
CREATE INDEX IF NOT EXISTS idx_punishments_type_time ON punishments (type, time DESC);
CREATE INDEX IF NOT EXISTS idx_punishments_uuid ON punishments (uuid);
CREATE INDEX IF NOT EXISTS idx_punishments_name ON punishments (name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS appeals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  punishment_id INTEGER NOT NULL REFERENCES punishments (id),
  uuid TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','denied','closed')),
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_appeals_uuid ON appeals (uuid, updated DESC);
CREATE INDEX IF NOT EXISTS idx_appeals_punishment ON appeals (punishment_id);

CREATE TABLE IF NOT EXISTS appeal_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appeal_id INTEGER NOT NULL REFERENCES appeals (id),
  uuid TEXT NOT NULL,
  name TEXT NOT NULL,
  staff INTEGER NOT NULL DEFAULT 0,
  system INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_appeal ON appeal_posts (appeal_id, id);

CREATE TABLE IF NOT EXISTS reports (
 id INTEGER PRIMARY KEY AUTOINCREMENT, player TEXT NOT NULL, category TEXT NOT NULL,
 details TEXT NOT NULL, evidence TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','resolved','dismissed'))
);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created DESC);

CREATE TABLE IF NOT EXISTS player_stats (
  uuid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gold INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  playtime INTEGER NOT NULL DEFAULT 0,
  last_seen INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_stats_name ON player_stats (name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_stats_gold ON player_stats (gold DESC);


-- Private owner-only report conversation. Players can submit reports but cannot read this table.
CREATE TABLE IF NOT EXISTS report_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES reports(id),
  author TEXT NOT NULL DEFAULT 'Owner',
  body TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_report_messages_report ON report_messages(report_id, id);

-- Staff applications are private to the owner. Only accepted applications consume a position.
CREATE TABLE IF NOT EXISTS staff_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  discord TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','moderator','helper','trial')),
  age_band TEXT NOT NULL,
  timezone TEXT NOT NULL,
  availability TEXT NOT NULL,
  experience TEXT NOT NULL DEFAULT '',
  motivation TEXT NOT NULL,
  created INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewing','accepted','denied'))
);
CREATE INDEX IF NOT EXISTS idx_staff_applications_status ON staff_applications(status, role);
CREATE INDEX IF NOT EXISTS idx_staff_applications_name ON staff_applications(name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS application_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES staff_applications(id),
  author TEXT NOT NULL DEFAULT 'Owner',
  body TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_application_messages_app ON application_messages(application_id, id);


-- Optional Discord contact for a report follow-up. The contact is owner-only.
CREATE TABLE IF NOT EXISTS report_contacts (
  report_id INTEGER PRIMARY KEY REFERENCES reports(id),
  contact TEXT NOT NULL
);
