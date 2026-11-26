-- CrownPVP Services project intake — independent from the player-support ticket system.
-- Apply this to the Cloudflare D1 database bound as DB.
CREATE TABLE IF NOT EXISTS service_project_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  discord TEXT,
  service TEXT NOT NULL,
  budget TEXT,
  timeline TEXT,
  brief TEXT NOT NULL,
  reference TEXT,
  created INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  ip_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_service_project_tickets_created ON service_project_tickets(created DESC);
CREATE INDEX IF NOT EXISTS idx_service_project_tickets_status ON service_project_tickets(status, created DESC);
