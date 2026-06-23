import { Hono } from "hono";
import { seasonSchema, type Season } from "@ai-fifa/shared/schemas";
import { errors } from "../middleware/error.js";
import type { AppContext } from "../bindings.js";

export const seasonRoutes = new Hono<AppContext>();

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const SEASON_ID = "11111111-1111-4111-8111-111111111111";

seasonRoutes.get("/api/v1/seasons/current", (c) => {
  // Build the season inside the handler — Cloudflare Workers
  // don't reliably support `Date.now()` at module scope (global scope),
  // even though it doesn't throw.
  const now = Date.now();
  const HARDCODED_SEASON: Season = {
    id: SEASON_ID,
    name: "Season 1 · Kickoff",
    starts_at: now,
    ends_at: now + 12 * ONE_WEEK,
    registration_deadline: now + ONE_WEEK,
  };
  const parsed = seasonSchema.safeParse(HARDCODED_SEASON);
  if (!parsed.success) {
    console.error("season schema failed", JSON.stringify(parsed.error.flatten()));
    throw errors.internal("Hardcoded season fails schema");
  }
  return c.json({ data: parsed.data });
});
