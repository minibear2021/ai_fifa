import { Hono } from "hono";
import { eq, and, or, desc, gt, inArray } from "drizzle-orm";
import { z } from "zod";
import { mulberry32, runMatch, seedFromMatchId, updateElo } from "@ai-fifa/shared/simulator";
import type { TeamSnapshot } from "@ai-fifa/shared/simulator";
import type { Player, Strategy, MatchEvent, MatchStats } from "@ai-fifa/shared/schemas";
import { createDb } from "../db/client.js";
import { matches, teams, players as playersTable, strategies as strategiesTable } from "../db/schema.js";
import { errors } from "../middleware/error.js";
import { requireUser } from "../middleware/session.js";
import type { AppContext } from "../bindings.js";

const createMatchSchema = z.object({
  home_id: z.string().uuid(),
  away_id: z.string().uuid(),
  kickoff_at: z.number().int().positive(),
}).refine((v) => v.home_id !== v.away_id, { message: "home and away must differ" });

function toMatchResponse(row: typeof matches.$inferSelect) {
  let events: MatchEvent[] | null = null;
  let stats: MatchStats | null = null;
  if (row.eventsJson) {
    try { events = JSON.parse(row.eventsJson) as MatchEvent[]; } catch { events = null; }
  }
  if (row.statsJson) {
    try { stats = JSON.parse(row.statsJson) as MatchStats; } catch { stats = null; }
  }
  return {
    id: row.id,
    season_id: row.seasonId,
    home_id: row.homeId,
    away_id: row.awayId,
    kickoff_at: row.kickoffAt,
    status: row.status,
    home_score: row.homeScore,
    away_score: row.awayScore,
    events,
    stats,
    created_at: row.createdAt,
  };
}

async function loadTeam(db: ReturnType<typeof createDb>, teamId: string): Promise<TeamSnapshot> {
  const row = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0];
  if (!row) throw errors.notFound("Team");
  const teamPlayers = await db.select().from(playersTable).where(eq(playersTable.teamId, teamId));
  const strategy = (await db.select().from(strategiesTable).where(eq(strategiesTable.teamId, teamId)).limit(1))[0];
  if (!strategy) throw errors.invalidInput("Team has no strategy");
  return {
    id: row.id,
    name: row.name,
    rating: row.rating,
    isHome: true,
    players: teamPlayers as unknown as Player[],
  };
}

async function loadStrategy(db: ReturnType<typeof createDb>, teamId: string): Promise<Strategy> {
  const row = (await db.select().from(strategiesTable).where(eq(strategiesTable.teamId, teamId)).limit(1))[0];
  if (!row) throw errors.invalidInput("Team has no strategy");
  return row as unknown as Strategy;
}

export const matchRoutes = new Hono<AppContext>();

matchRoutes.get("/api/v1/matches", async (c) => {
  const status = c.req.query("status");
  const teamId = c.req.query("team_id");
  const limit = Math.min(Number.parseInt(c.req.query("limit") ?? "50", 10) || 50, 200);

  const db = createDb(c.env.DB);
  const conditions = [];
  if (status) conditions.push(eq(matches.status, status as typeof matches.$inferSelect.status));
  if (teamId) conditions.push(or(eq(matches.homeId, teamId), eq(matches.awayId, teamId)));

  const rows = await db
    .select()
    .from(matches)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(matches.kickoffAt))
    .limit(limit);
  return c.json({ data: rows.map(toMatchResponse) });
});

matchRoutes.get("/api/v1/matches/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  const row = (await db.select().from(matches).where(eq(matches.id, id)).limit(1))[0];
  if (!row) throw errors.notFound("Match");
  return c.json({ data: toMatchResponse(row) });
});

matchRoutes.post("/api/v1/matches", async (c) => {
  requireUser(c);
  const body = await c.req.json().catch(() => null);
  const parsed = createMatchSchema.safeParse(body);
  if (!parsed.success) throw errors.validationFailed(parsed.error.flatten());

  const db = createDb(c.env.DB);
  const home = (await db.select().from(teams).where(eq(teams.id, parsed.data.home_id)).limit(1))[0];
  const away = (await db.select().from(teams).where(eq(teams.id, parsed.data.away_id)).limit(1))[0];
  if (!home || !away) throw errors.invalidInput("Both teams must exist");
  if (home.userId === away.userId) throw errors.invalidInput("Teams must belong to different users");

  const id = crypto.randomUUID();
  await db.insert(matches).values({
    id,
    seasonId: null,
    homeId: parsed.data.home_id,
    awayId: parsed.data.away_id,
    kickoffAt: parsed.data.kickoff_at,
    status: "scheduled",
    createdAt: Date.now(),
  });

  const row = (await db.select().from(matches).where(eq(matches.id, id)).limit(1))[0]!;
  return c.json({ data: toMatchResponse(row) }, 201);
});

matchRoutes.post("/api/v1/matches/:id/simulate", async (c) => {
  requireUser(c);
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const row = (await db.select().from(matches).where(eq(matches.id, id)).limit(1))[0];
  if (!row) throw errors.notFound("Match");
  if (row.status === "finished" || row.status === "simulated") {
    throw errors.conflict("ALREADY_SIMULATED", `Match is already ${row.status}`);
  }

  const homeSnap = await loadTeam(db, row.homeId);
  const awaySnap: TeamSnapshot = { ...await loadTeam(db, row.awayId), isHome: false };
  const homeStrategy = await loadStrategy(db, row.homeId);
  const awayStrategy = await loadStrategy(db, row.awayId);

  const rng = mulberry32(seedFromMatchId(row.id));
  const result = runMatch(
    {
      matchId: row.id,
      home: homeSnap,
      away: awaySnap,
      homeStrategy,
      awayStrategy,
    },
    rng,
  );

  const homeTeam = (await db.select().from(teams).where(eq(teams.id, row.homeId)).limit(1))[0]!;
  const awayTeam = (await db.select().from(teams).where(eq(teams.id, row.awayId)).limit(1))[0]!;
  const elo = updateElo(homeTeam.rating, awayTeam.rating, result.finalScore[0], result.finalScore[1]);

  await db
    .update(matches)
    .set({
      status: "finished",
      homeScore: result.finalScore[0],
      awayScore: result.finalScore[1],
      eventsJson: JSON.stringify(result.events),
      statsJson: JSON.stringify(result.stats),
    })
    .where(eq(matches.id, row.id));
  await db.update(teams).set({ rating: elo.newHome }).where(eq(teams.id, homeTeam.id));
  await db.update(teams).set({ rating: elo.newAway }).where(eq(teams.id, awayTeam.id));

  const updated = (await db.select().from(matches).where(eq(matches.id, row.id)).limit(1))[0]!;
  return c.json({ data: toMatchResponse(updated) });
});
