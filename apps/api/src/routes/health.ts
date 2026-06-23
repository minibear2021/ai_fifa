import { Hono } from "hono";
import type { AppContext } from "../bindings.js";

export const healthRoutes = new Hono<AppContext>();

healthRoutes.get("/healthz", (c) =>
  c.json({ status: "ok", env: c.env.ENVIRONMENT ?? "unknown", ts: Date.now() }),
);
