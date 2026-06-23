import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const seasons = sqliteTable("seasons", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startsAt: integer("starts_at").notNull(),
  endsAt: integer("ends_at").notNull(),
  registrationDeadline: integer("registration_deadline").notNull(),
});

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    createdAt: integer("created_at").notNull(),
    isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  },
  (t) => ({
    emailIdx: index("idx_users_email").on(t.email),
  }),
);

export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seasonId: text("season_id").references(() => seasons.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    formation: text("formation").notNull(),
    rating: integer("rating").notNull().default(1500),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    userIdx: index("idx_teams_user").on(t.userId),
    ratingIdx: index("idx_teams_rating").on(t.rating),
    seasonIdx: index("idx_teams_season").on(t.seasonId),
  }),
);

export const players = sqliteTable(
  "players",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: text("position", { enum: ["GK", "DF", "MF", "FW"] }).notNull(),
    pace: integer("pace").notNull(),
    shooting: integer("shooting").notNull(),
    passing: integer("passing").notNull(),
    defending: integer("defending").notNull(),
    stamina: integer("stamina").notNull(),
    overall: integer("overall").notNull(),
  },
  (t) => ({
    teamIdx: index("idx_players_team").on(t.teamId),
  }),
);

export const strategies = sqliteTable("strategies", {
  teamId: text("team_id")
    .primaryKey()
    .references(() => teams.id, { onDelete: "cascade" }),
  formation: text("formation").notNull(),
  style: text("style").notNull(),
  mentality: text("mentality").notNull(),
  pressing: integer("pressing").notNull(),
  passingRisk: integer("passing_risk").notNull(),
  width: integer("width").notNull(),
  foulsTactical: integer("fouls_tactical", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at").notNull(),
});

export const matches = sqliteTable(
  "matches",
  {
    id: text("id").primaryKey(),
    seasonId: text("season_id").references(() => seasons.id, { onDelete: "set null" }),
    homeId: text("home_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    awayId: text("away_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    kickoffAt: integer("kickoff_at").notNull(),
    status: text("status", { enum: ["scheduled", "locked", "simulated", "finished"] })
      .notNull()
      .default("scheduled"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    eventsJson: text("events_json"),
    statsJson: text("stats_json"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    seasonIdx: index("idx_matches_season").on(t.seasonId),
    kickoffIdx: index("idx_matches_kickoff").on(t.kickoffAt),
    statusIdx: index("idx_matches_status").on(t.status),
    homeIdx: index("idx_matches_home").on(t.homeId),
    awayIdx: index("idx_matches_away").on(t.awayId),
  }),
);

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    lastUsedAt: integer("last_used_at"),
    createdAt: integer("created_at").notNull(),
    revokedAt: integer("revoked_at"),
  },
  (t) => ({
    userIdx: index("idx_apikey_user").on(t.userId),
  }),
);

export type SeasonRow = typeof seasons.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type TeamRow = typeof teams.$inferSelect;
export type PlayerRow = typeof players.$inferSelect;
export type StrategyRow = typeof strategies.$inferSelect;
export type MatchRow = typeof matches.$inferSelect;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
