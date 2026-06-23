import { Hono } from "hono";
import { seasonSchema, type Season } from "@ai-fifa/shared/schemas";
import { errors } from "../middleware/error.js";
import type { AppContext } from "../bindings.js";

export const seasonRoutes = new Hono<AppContext>();

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

// Use a fixed, schema-compliant UUID v4 (literal, not random).
// Note: Cloudflare Workers disallow `crypto.randomUUID()` at module-load
// (global scope), so we must inline a valid v4 literal here.
const SEASON_ID = "11111111-1111-4111-8111-111111111111";

const HARDCODED_SEASON: Season = (() => {
  const now = Date.now();
  return {
    id: SEASON_ID,
    name: "Season 1 · Kickoff",
    starts_at: now,
    ends_at: now + 12 * ONE_WEEK,
    registration_deadline: now + ONE_WEEK,
  };
})();

seasonRoutes.get("/api/v1/seasons/current", (c) => {
  const parsed = seasonSchema.safeParse(HARDCODED_SEASON);
  if (!parsed.success) {
    console.error("season schema failed", JSON.stringify(parsed.error.flatten()));
    throw errors.internal("Hardcoded season fails schema");
  }
  return c.json({ data: parsed.data });
});
