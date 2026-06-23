import { Hono } from "hono";
import { seasonSchema, type Season } from "@ai-fifa/shared/schemas";
import { errors } from "../middleware/error.js";
import type { AppContext } from "../bindings.js";

export const seasonRoutes = new Hono<AppContext>();

const NOW = Date.now();
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const HARDCODED_SEASON: Season = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Season 1 · Kickoff",
  starts_at: NOW,
  ends_at: NOW + 12 * ONE_WEEK,
  registration_deadline: NOW + ONE_WEEK,
};

seasonRoutes.get("/api/v1/seasons/current", (c) => {
  const parsed = seasonSchema.safeParse(HARDCODED_SEASON);
  if (!parsed.success) {
    throw errors.internal("Hardcoded season fails schema");
  }
  return c.json({ data: parsed.data });
});
