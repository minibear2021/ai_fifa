import { z } from "zod";

export const positionSchema = z.enum(["GK", "DF", "MF", "FW"]);
export type Position = z.infer<typeof positionSchema>;

export const formationSchema = z.enum([
  "4-3-3",
  "4-4-2",
  "3-5-2",
  "4-2-3-1",
  "5-3-2",
  "3-4-3",
]);
export type Formation = z.infer<typeof formationSchema>;

export const playingStyleSchema = z.enum([
  "possession",
  "counter-attack",
  "pressing",
  "direct",
  "park-the-bus",
]);
export type PlayingStyle = z.infer<typeof playingStyleSchema>;

export const mentalitySchema = z.enum([
  "defensive",
  "cautious",
  "balanced",
  "attacking",
  "all-out",
]);
export type Mentality = z.infer<typeof mentalitySchema>;

export const matchStatusSchema = z.enum([
  "scheduled",
  "locked",
  "simulated",
  "finished",
]);
export type MatchStatus = z.infer<typeof matchStatusSchema>;

const idSchema = z.string().uuid();
const timestampSchema = z.number().int().positive();
const ratingRange = z.number().int().min(0).max(3000);
const statRange = z.number().int().min(0).max(100);

export const playerSchema = z.object({
  id: idSchema,
  team_id: idSchema,
  name: z.string().min(1).max(64),
  position: positionSchema,
  pace: statRange,
  shooting: statRange,
  passing: statRange,
  defending: statRange,
  stamina: statRange,
  overall: statRange,
});
export type Player = z.infer<typeof playerSchema>;

export const teamSchema = z.object({
  id: idSchema,
  user_id: idSchema,
  name: z.string().min(1).max(64),
  formation: formationSchema,
  rating: ratingRange,
  created_at: timestampSchema,
});
export type Team = z.infer<typeof teamSchema>;

export const strategySchema = z.object({
  team_id: idSchema,
  formation: formationSchema,
  style: playingStyleSchema,
  mentality: mentalitySchema,
  pressing: statRange,
  passing_risk: statRange,
  width: statRange,
  fouls_tactical: z.boolean(),
  updated_at: timestampSchema,
});
export type Strategy = z.infer<typeof strategySchema>;

export const matchEventSchema = z.discriminatedUnion("type", [
  z.object({ t: z.number(), type: z.literal("kickoff"), team: z.enum(["home", "away"]) }),
  z.object({ t: z.number(), type: z.literal("possession"), team: z.enum(["home", "away"]), duration: z.number() }),
  z.object({ t: z.number(), type: z.literal("attack"), team: z.enum(["home", "away"]), success: z.boolean() }),
  z.object({
    t: z.number(),
    type: z.literal("shot"),
    team: z.enum(["home", "away"]),
    on_target: z.boolean(),
    xg: z.number(),
    taker: z.string(),
  }),
  z.object({
    t: z.number(),
    type: z.literal("goal"),
    team: z.enum(["home", "away"]),
    scorer: z.string(),
    assist: z.string().optional(),
    minute: z.number(),
  }),
  z.object({ t: z.number(), type: z.literal("foul"), team: z.enum(["home", "away"]), player: z.string() }),
  z.object({
    t: z.number(),
    type: z.literal("card"),
    team: z.enum(["home", "away"]),
    player: z.string(),
    color: z.enum(["yellow", "red"]),
  }),
  z.object({
    t: z.number(),
    type: z.literal("substitution"),
    team: z.enum(["home", "away"]),
    out: z.string(),
    in_: z.string(),
  }),
  z.object({
    t: z.number(),
    type: z.literal("possession_update"),
    home: z.number().min(0).max(100),
    away: z.number().min(0).max(100),
  }),
  z.object({ t: z.number(), type: z.literal("halftime"), score: z.tuple([z.number().int(), z.number().int()]) }),
  z.object({ t: z.number(), type: z.literal("fulltime"), score: z.tuple([z.number().int(), z.number().int()]) }),
]);
export type MatchEvent = z.infer<typeof matchEventSchema>;

export const matchStatsSchema = z.object({
  home_possession: z.number().min(0).max(100),
  away_possession: z.number().min(0).max(100),
  home_shots: z.number().int().min(0),
  away_shots: z.number().int().min(0),
  home_shots_on_target: z.number().int().min(0),
  away_shots_on_target: z.number().int().min(0),
  home_corners: z.number().int().min(0),
  away_corners: z.number().int().min(0),
  home_fouls: z.number().int().min(0),
  away_fouls: z.number().int().min(0),
  home_yellow: z.number().int().min(0),
  away_yellow: z.number().int().min(0),
  home_red: z.number().int().min(0),
  away_red: z.number().int().min(0),
});
export type MatchStats = z.infer<typeof matchStatsSchema>;

export const matchSchema = z.object({
  id: idSchema,
  season_id: idSchema,
  home_id: idSchema,
  away_id: idSchema,
  kickoff_at: timestampSchema,
  status: matchStatusSchema,
  home_score: z.number().int().min(0).nullable(),
  away_score: z.number().int().min(0).nullable(),
  events: z.array(matchEventSchema).nullable(),
  stats: matchStatsSchema.nullable(),
  created_at: timestampSchema,
});
export type Match = z.infer<typeof matchSchema>;

export const seasonSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(64),
  starts_at: timestampSchema,
  ends_at: timestampSchema,
  registration_deadline: timestampSchema,
});
export type Season = z.infer<typeof seasonSchema>;

export const userSchema = z.object({
  id: idSchema,
  email: z.string().email().max(255),
  display_name: z.string().min(1).max(64),
  created_at: timestampSchema,
  is_admin: z.boolean(),
});
export type User = z.infer<typeof userSchema>;

export const apiKeySchema = z.object({
  id: idSchema,
  user_id: idSchema,
  label: z.string().min(1).max(64),
  key_prefix: z.string().min(1).max(32),
  last_used_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  revoked_at: timestampSchema.nullable(),
});
export type ApiKey = z.infer<typeof apiKeySchema>;
