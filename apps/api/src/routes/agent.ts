import { Hono } from "hono";
import { eq, and, or, gt } from "drizzle-orm";
import { z } from "zod";
import type { Player, Strategy } from "@ai-fifa/shared/schemas";
import { createDb } from "../db/client.js";
import { teams, players as playersTable, strategies as strategiesTable, matches, users } from "../db/schema.js";
import { errors } from "../middleware/error.js";
import { requireApiKey } from "../middleware/apiKey.js";
import type { AppContext } from "../bindings.js";

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

function teamSnapshot(row: typeof teams.$inferSelect) {
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

async function loadUserTeam(db: ReturnType<typeof createDb>, userId: string) {
  const rows = await db.select().from(teams).where(eq(teams.userId, userId)).limit(1);
  return rows[0];
}

async function assertCanEditStrategy(db: ReturnType<typeof createDb>, teamId: string) {
  const now = Date.now();
  const upcomingHome = await db.select().from(matches).where(eq(matches.homeId, teamId));
  const upcomingAway = await db.select().from(matches).where(eq(matches.awayId, teamId));
  const allUpcoming = [...upcomingHome, ...upcomingAway].filter(
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
}

export const agentRoutes = new Hono<AppContext>();

agentRoutes.get("/api/v1/agent/me", async (c) => {
  const { userId, keyId } = requireApiKey(c);
  const db = createDb(c.env.DB);
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) throw errors.notFound("User");
  const team = await loadUserTeam(db, userId);
  return c.json({
    data: {
      user: { id: user.id, email: user.email, display_name: user.displayName },
      api_key_id: keyId,
      team: team ? teamSnapshot(team) : null,
      capabilities: {
        can_update_strategy: true,
        can_view_matches: true,
        rate_limit_per_minute: 120,
      },
    },
  });
});

agentRoutes.get("/api/v1/agent/team", async (c) => {
  const { userId } = requireApiKey(c);
  const db = createDb(c.env.DB);
  const team = await loadUserTeam(db, userId);
  if (!team) throw errors.notFound("Team");
  const teamPlayers = await db.select().from(playersTable).where(eq(playersTable.teamId, team.id));
  const strategy = (await db.select().from(strategiesTable).where(eq(strategiesTable.teamId, team.id)).limit(1))[0];
  return c.json({
    data: {
      team: teamSnapshot(team),
      players: teamPlayers as unknown as Player[],
      strategy: strategy as unknown as Strategy | null,
    },
  });
});

agentRoutes.get("/api/v1/agent/team/strategy", async (c) => {
  const { userId } = requireApiKey(c);
  const db = createDb(c.env.DB);
  const team = await loadUserTeam(db, userId);
  if (!team) throw errors.notFound("Team");
  const strategy = (await db.select().from(strategiesTable).where(eq(strategiesTable.teamId, team.id)).limit(1))[0];
  if (!strategy) throw errors.notFound("Strategy");
  return c.json({ data: strategy });
});

agentRoutes.patch("/api/v1/agent/team/strategy", async (c) => {
  const { userId } = requireApiKey(c);
  const body = await c.req.json().catch(() => null);
  const parsed = strategyPatchSchema.safeParse(body);
  if (!parsed.success) throw errors.validationFailed(parsed.error.flatten());

  const db = createDb(c.env.DB);
  const team = await loadUserTeam(db, userId);
  if (!team) throw errors.notFound("Team");
  await assertCanEditStrategy(db, team.id);

  await db
    .update(strategiesTable)
    .set({
      formation: parsed.data.formation,
      style: parsed.data.style,
      mentality: parsed.data.mentality,
      pressing: parsed.data.pressing,
      passingRisk: parsed.data.passing_risk,
      width: parsed.data.width,
      foulsTactical: parsed.data.fouls_tactical,
      updatedAt: Date.now(),
    })
    .where(eq(strategiesTable.teamId, team.id));

  const updated = (await db.select().from(strategiesTable).where(eq(strategiesTable.teamId, team.id)).limit(1))[0]!;
  return c.json({ data: updated });
});

agentRoutes.get("/api/v1/agent/matches/upcoming", async (c) => {
  const { userId } = requireApiKey(c);
  const db = createDb(c.env.DB);
  const team = await loadUserTeam(db, userId);
  if (!team) throw errors.notFound("Team");

  const now = Date.now();
  const horizon = now + 7 * 24 * 60 * 60 * 1000;
  const all = await db
    .select()
    .from(matches)
    .where(
      and(
        or(eq(matches.homeId, team.id), eq(matches.awayId, team.id)),
        gt(matches.kickoffAt, now),
      ),
    );
  const filtered = all.filter((m) => m.kickoffAt <= horizon);
  return c.json({ data: filtered });
});

agentRoutes.get("/api/v1/agent/matches/:id", async (c) => {
  const { userId } = requireApiKey(c);
  const matchId = c.req.param("id");
  const db = createDb(c.env.DB);
  const team = await loadUserTeam(db, userId);
  if (!team) throw errors.notFound("Team");
  const row = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
  if (!row) throw errors.notFound("Match");
  if (row.homeId !== team.id && row.awayId !== team.id) throw errors.forbidden("Not your match");
  return c.json({ data: row });
});

agentRoutes.get("/api/v1/agent/matches/:id/opponent", async (c) => {
  const { userId } = requireApiKey(c);
  const matchId = c.req.param("id");
  const db = createDb(c.env.DB);
  const team = await loadUserTeam(db, userId);
  if (!team) throw errors.notFound("Team");
  const match = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
  if (!match) throw errors.notFound("Match");
  if (match.homeId !== team.id && match.awayId !== team.id) throw errors.forbidden("Not your match");
  const oppId = match.homeId === team.id ? match.awayId : match.homeId;
  const opp = (await db.select().from(teams).where(eq(teams.id, oppId)).limit(1))[0];
  if (!opp) throw errors.notFound("Opponent");
  const oppPlayers = await db.select().from(playersTable).where(eq(playersTable.teamId, oppId));
  const oppStrategy = (await db.select().from(strategiesTable).where(eq(strategiesTable.teamId, oppId)).limit(1))[0];
  return c.json({
    data: {
      team: teamSnapshot(opp),
      players: oppPlayers as unknown as Player[],
      strategy: oppStrategy as unknown as Strategy | null,
    },
  });
});
