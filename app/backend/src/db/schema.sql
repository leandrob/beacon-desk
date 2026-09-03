-- Beacon Desk database schema (support ticketing).
-- Kept intentionally simple and readable.

PRAGMA foreign_keys = ON;

-- Support agents (the people who log in).
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'agent',   -- 'admin' | 'agent'
  title         TEXT,
  color         TEXT NOT NULL DEFAULT '#f59e0b', -- avatar color
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- End customers who open tickets.
CREATE TABLE IF NOT EXISTS customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  company    TEXT,
  plan       TEXT NOT NULL DEFAULT 'free',        -- 'free' | 'pro' | 'enterprise'
  phone      TEXT,
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- SLA targets per priority, in hours.
CREATE TABLE IF NOT EXISTS sla_policies (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  priority             TEXT NOT NULL UNIQUE,      -- 'low' | 'normal' | 'high' | 'urgent'
  first_response_hours REAL NOT NULL,
  resolution_hours     REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  number             INTEGER NOT NULL UNIQUE,      -- human id, e.g. 1042 -> "BD-1042"
  subject            TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'open', -- open | pending | in_progress | resolved | closed
  priority           TEXT NOT NULL DEFAULT 'normal',
  channel            TEXT NOT NULL DEFAULT 'email',-- email | chat | web | phone
  category           TEXT,                        -- billing | bug | how_to | feature | account | other
  customer_id        INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assignee_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  first_response_at  TEXT,
  resolved_at        TEXT,
  closed_at          TEXT,
  sla_response_due   TEXT,
  sla_resolution_due TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Conversation thread: public replies and internal notes.
CREATE TABLE IF NOT EXISTS ticket_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL,                       -- 'agent' | 'customer'
  author_id   INTEGER,                             -- users.id or customers.id
  body        TEXT NOT NULL,
  is_internal INTEGER NOT NULL DEFAULT 0,          -- 1 = private note (agents only)
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Audit trail of field changes on a ticket.
CREATE TABLE IF NOT EXISTS ticket_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type       TEXT NOT NULL,                        -- created | status | priority | assignee | tag_added | tag_removed
  from_value TEXT,
  to_value   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#64748b'
);

CREATE TABLE IF NOT EXISTS ticket_tags (
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tag_id    INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);

-- Canned responses agents can insert into a reply.
CREATE TABLE IF NOT EXISTS macros (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  shortcut   TEXT,                                 -- e.g. "/refund"
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Knowledge base articles.
CREATE TABLE IF NOT EXISTS articles (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  category   TEXT NOT NULL DEFAULT 'general',
  body       TEXT NOT NULL,
  published  INTEGER NOT NULL DEFAULT 0,
  views      INTEGER NOT NULL DEFAULT 0,
  author_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Global activity feed.
CREATE TABLE IF NOT EXISTS activities (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,
  message     TEXT NOT NULL,
  entity_type TEXT,
  entity_id   INTEGER,
  actor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tickets_status    ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority  ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_customer  ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee  ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_messages_ticket   ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_events_ticket     ON ticket_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tags_tag   ON ticket_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);
