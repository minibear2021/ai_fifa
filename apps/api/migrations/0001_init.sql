CREATE TABLE IF NOT EXISTS seasons (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  starts_at             INTEGER NOT NULL,
  ends_at               INTEGER NOT NULL,
  registration_deadline INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  is_admin      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
