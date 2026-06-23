import { beforeAll } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";

const MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS seasons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    starts_at INTEGER NOT NULL,
    ends_at INTEGER NOT NULL,
    registration_deadline INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    season_id TEXT REFERENCES seasons(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    formation TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 1500,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teams_user ON teams(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_teams_rating ON teams(rating)`,
  `CREATE INDEX IF NOT EXISTS idx_teams_season ON teams(season_id)`,
  `CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT NOT NULL CHECK (position IN ('GK','DF','MF','FW')),
    pace INTEGER NOT NULL,
    shooting INTEGER NOT NULL,
    passing INTEGER NOT NULL,
    defending INTEGER NOT NULL,
    stamina INTEGER NOT NULL,
    overall INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id)`,
  `CREATE TABLE IF NOT EXISTS strategies (
    team_id TEXT PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
    formation TEXT NOT NULL,
    style TEXT NOT NULL,
    mentality TEXT NOT NULL,
    pressing INTEGER NOT NULL,
    passing_risk INTEGER NOT NULL,
    width INTEGER NOT NULL,
    fouls_tactical INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    season_id TEXT REFERENCES seasons(id) ON DELETE SET NULL,
    home_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    away_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    kickoff_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','locked','simulated','finished')),
    home_score INTEGER,
    away_score INTEGER,
    events_json TEXT,
    stats_json TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season_id)`,
  `CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches(kickoff_at)`,
  `CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)`,
  `CREATE INDEX IF NOT EXISTS idx_matches_home ON matches(home_id)`,
  `CREATE INDEX IF NOT EXISTS idx_matches_away ON matches(away_id)`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    last_used_at INTEGER,
    created_at INTEGER NOT NULL,
    revoked_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_apikey_user ON api_keys(user_id)`,
];

async function runMigrations() {
  const cf = await import("cloudflare:test");
  const env = cf.env as { DB: D1Database };
  for (const stmt of MIGRATION_STATEMENTS) {
    await env.DB.prepare(stmt).run();
  }
}

beforeAll(async () => {
  await runMigrations();
});
