import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { createDb } from "../db/client.js";
import { teams, players, strategies, matches } from "../db/schema.js";
import { generateDefaultPlayers, defaultStrategy, toPlayerRow, toStrategyRow } from "../lib/factory/team.js";
import { errors } from "../middleware/error.js";
import { requireUser } from "../middleware/session.js";
import type { AppContext } from "../bindings.js";

const createTeamSchema = z.object({
  name: z.string().min(1).max(64),
  formation: z.enum(["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3"]).default("4-4-2"),
});

const strategyPatchSchema = z.object({
  formation: z.enum(["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3"]),
  style: z.enum(["possession", "counter-attack", "pressing", "direct", "park-the-bus"]),
  mentality: z.enum(["defensive", "cautious", "balanced", "attacking", "all-out"]),
  pressing: z.number().int().min(0).max(100),
  passing_risk: z.number().int().min(0).max(100),
  width: z.number().int().min(0).max(100),
  fouls_tactical: z.boolean(),
});

const STRATEGY_LOCK_MINUTES = 30;

function toTeamResponse(row: typeof teams.$inferSelect) {
  return {
    id: row.id,
    user_id: row.userId,
    season_id: row.seasonId,
    name: row.name,
    formation: row.formation,
    rating: row.rating,
    created_at: row.createdAt,
  };
}

export const teamRoutes = new Hono<AppContext>();

teamRoutes.post("/api/v1/me/teams", async (c) => {
  const userId = requireUser(c);
  const body = await c.req.json().catch(() => null);
  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) throw errors.validationFailed(parsed.error.flatten());

  const db = createDb(c.env.DB);
  const teamId = crypto.randomUUID();
  const now = Date.now();

  await db.insert(teams).values({
    id: teamId,
    userId,
    seasonId: null,
    name: parsed.data.name,
    formation: parsed.data.formation,
    rating: 1500,
    createdAt: now,
  });
  for (const player of generateDefaultPlayers(teamId).map(toPlayerRow)) {
    await db.insert(players).values(player);
  }
  await db.insert(strategies).values(toStrategyRow({ ...defaultStrategy(teamId), updated_at: now }));

  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]!;
  return c.json({ data: toTeamResponse(team) }, 201);
});

teamRoutes.get("/api/v1/me/teams", async (c) => {
  const userId = requireUser(c);
  const db = createDb(c.env.DB);
  const rows = await db.select().from(teams).where(eq(teams.userId, userId));
  return c.json({ data: rows.map(toTeamResponse) });
});

teamRoutes.get("/api/v1/me/teams/:id", async (c) => {
  const userId = requireUser(c);
  const teamId = c.req.param("id");
  const db = createDb(c.env.DB);

  const team = (await db.select().from(teams).where(and(eq(teams.id, teamId), eq(teams.userId, userId))).limit(1))[0];
  if (!team) throw errors.notFound("Team");

  const teamPlayers = await db.select().from(players).where(eq(players.teamId, teamId));
  const strategy = (await db.select().from(strategies).where(eq(strategies.teamId, teamId)).limit(1))[0];

  return c.json({
    data: {
      team: toTeamResponse(team),
      players: teamPlayers,
      strategy: strategy ?? null,
    },
  });
});

teamRoutes.patch("/api/v1/me/teams/:id/strategy", async (c) => {
  const userId = requireUser(c);
  const teamId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = strategyPatchSchema.safeParse(body);
  if (!parsed.success) throw errors.validationFailed(parsed.error.flatten());

  const db = createDb(c.env.DB);
  const team = (await db.select().from(teams).where(and(eq(teams.id, teamId), eq(teams.userId, userId))).limit(1))[0];
  if (!team) throw errors.notFound("Team");

  const now = Date.now();
  const upcoming = await db
    .select()
    .from(matches)
    .where(eq(matches.homeId, teamId))
    .all();
  const upcomingAway = await db
    .select()
    .from(matches)
    .where(eq(matches.awayId, teamId))
    .all();
  const allUpcoming = [...upcoming, ...upcomingAway].filter(
    (m) => (m.status === "scheduled" || m.status === "locked") && m.kickoffAt > now,
  );
  const lockThreshold = now + STRATEGY_LOCK_MINUTES * 60 * 1000;
  const locked = allUpcoming.find((m) => m.kickoffAt <= lockThreshold);
  if (locked) {
    throw errors.conflict(
      "STRATEGY_LOCKED",
      `Strategy locked: next match ${locked.id} starts in ≤${STRATEGY_LOCK_MINUTES} minutes`,
    );
  }

  await db
    .update(strategies)
    .set({
      formation: parsed.data.formation,
      style: parsed.data.style,
      mentality: parsed.data.mentality,
      pressing: parsed.data.pressing,
      passingRisk: parsed.data.passing_risk,
      width: parsed.data.width,
      foulsTactical: parsed.data.fouls_tactical,
      updatedAt: now,
    })
    .where(eq(strategies.teamId, teamId));

  const updated = (await db.select().from(strategies).where(eq(strategies.teamId, teamId)).limit(1))[0]!;
  return c.json({ data: updated });
});
