import { Hono } from "hono";
import { AppError, isAppError } from "./middleware/error.js";
import { corsMiddleware } from "./middleware/cors.js";
import { sessionMiddleware } from "./middleware/session.js";
import { apiKeyMiddleware } from "./middleware/apiKey.js";
import { healthRoutes } from "./routes/health.js";
import { seasonRoutes } from "./routes/seasons.js";
import { authRoutes } from "./routes/auth.js";
import { teamRoutes } from "./routes/teams.js";
import { apiKeyRoutes } from "./routes/apiKeys.js";
import { agentRoutes } from "./routes/agent.js";
import { matchRoutes } from "./routes/matches.js";
import { leaderboardRoutes } from "./routes/leaderboard.js";
import { docsRoutes } from "./routes/docs.js";
import type { AppContext } from "./bindings.js";
import type { StatusCode } from "hono/utils/http-status";

export function createApp() {
  const app = new Hono<AppContext>();

  app.use("*", corsMiddleware);
  app.use("*", sessionMiddleware);
  app.use("*", apiKeyMiddleware);

  app.onError((err, c) => {
    if (isAppError(err)) {
      c.status(err.status as StatusCode);
      return c.json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    console.error("unhandled error", err);
    c.status(500);
    return c.json({ error: { code: "INTERNAL", message: "Internal server error" } });
  });

  app.route("/", healthRoutes);
  app.route("/", seasonRoutes);
  app.route("/", authRoutes);
  app.route("/", teamRoutes);
  app.route("/", apiKeyRoutes);
  app.route("/", agentRoutes);
  app.route("/", matchRoutes);
  app.route("/", leaderboardRoutes);
  app.route("/", docsRoutes);

  app.notFound((c) =>
    c.json({ error: { code: "NOT_FOUND", message: `No route for ${c.req.method} ${c.req.path}` } }, 404),
  );

  return app;
}

export { AppError };
