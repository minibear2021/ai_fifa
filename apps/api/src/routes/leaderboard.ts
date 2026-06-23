import { Hono } from "hono";
import { desc, inArray } from "drizzle-orm";
import { createDb } from "../db/client.js";
import { teams, users } from "../db/schema.js";
import type { AppContext } from "../bindings.js";

export const leaderboardRoutes = new Hono<AppContext>();

leaderboardRoutes.get("/api/v1/teams", async (c) => {
  const limit = Math.min(Number.parseInt(c.req.query("limit") ?? "50", 10) || 50, 200);
  const db = createDb(c.env.DB);
  const rows = await db
    .select()
    .from(teams)
    .orderBy(desc(teams.rating))
    .limit(limit);

  const userIds = Array.from(new Set(rows.map((r) => r.userId)));
  const userMap = new Map<string, string>();
  if (userIds.length > 0) {
    const userRows = await db
      .select({ id: users.id, name: users.displayName })
      .from(users)
      .where(inArray(users.id, userIds));
    for (const u of userRows) userMap.set(u.id, u.name);
  }

  return c.json({
    data: rows.map((r) => ({
      id: r.id,
      user_id: r.userId,
      season_id: r.seasonId,
      name: r.name,
      formation: r.formation,
      rating: r.rating,
      created_at: r.createdAt,
      owner_name: userMap.get(r.userId) ?? null,
    })),
  });
});
