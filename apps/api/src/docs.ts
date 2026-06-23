import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  seasonSchema,
  teamSchema,
  strategySchema,
  playerSchema,
  userSchema,
  apiKeySchema,
} from "@ai-fifa/shared/schemas";

const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

const dataEnvelope = <T extends z.ZodType>(inner: T) =>
  z.object({ data: inner, meta: z.object({}).passthrough().optional() });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().min(1).max(64),
});

const createTeamSchema = z.object({
  name: z.string().min(1).max(64),
  formation: z.enum(["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3"]),
});

const teamDetailSchema = z.object({
  team: teamSchema,
  players: z.array(playerSchema),
  strategy: strategySchema.nullable(),
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

const apiKeyCreateSchema = z.object({ label: z.string().min(1).max(64) });
const apiKeyWithSecretSchema = apiKeySchema.extend({ secret: z.string() });

const createMatchSchema = z.object({
  home_id: z.string().uuid(),
  away_id: z.string().uuid(),
  kickoff_at: z.number().int().positive(),
});

const matchStatusSchema = z.enum(["scheduled", "locked", "simulated", "finished"]);
const matchSchema = z.object({
  id: z.string().uuid(),
  season_id: z.string().uuid().nullable(),
  home_id: z.string().uuid(),
  away_id: z.string().uuid(),
  kickoff_at: z.number().int(),
  status: matchStatusSchema,
  home_score: z.number().int().nullable(),
  away_score: z.number().int().nullable(),
  events: z.array(z.unknown()).nullable(),
  stats: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.number().int(),
});

const teamWithOwnerSchema = teamSchema.extend({ owner_name: z.string().nullable() });

const agentMeSchema = z.object({
  user: z.object({ id: z.string().uuid(), email: z.string(), display_name: z.string() }),
  api_key_id: z.string().uuid(),
  team: teamSchema.nullable(),
  capabilities: z.object({
    can_update_strategy: z.boolean(),
    can_view_matches: z.boolean(),
    rate_limit_per_minute: z.number().int(),
  }),
});

export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  registry.registerPath({
    method: "get",
    path: "/healthz",
    summary: "Liveness probe",
    responses: {
      200: {
        description: "OK",
        content: { "application/json": { schema: z.object({ status: z.literal("ok"), env: z.string(), ts: z.number() }) } },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/seasons/current",
    summary: "Get the currently active season",
    responses: {
      200: { description: "Season found", content: { "application/json": { schema: dataEnvelope(seasonSchema) } } },
      404: { description: "No active season", content: { "application/json": { schema: errorSchema } } },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/register",
    summary: "Create a new account",
    request: { body: { content: { "application/json": { schema: registerSchema } } } },
    responses: {
      201: { description: "Account created", content: { "application/json": { schema: dataEnvelope(userSchema) } } },
      400: { description: "Validation failed", content: { "application/json": { schema: errorSchema } } },
      409: { description: "Email taken", content: { "application/json": { schema: errorSchema } } },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/login",
    summary: "Log in and receive a session cookie",
    request: { body: { content: { "application/json": { schema: loginSchema } } } },
    responses: {
      200: { description: "Logged in", content: { "application/json": { schema: dataEnvelope(userSchema) } } },
      400: { description: "Invalid credentials", content: { "application/json": { schema: errorSchema } } },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/logout",
    summary: "Clear the session cookie",
    responses: {
      200: { description: "Logged out", content: { "application/json": { schema: dataEnvelope(z.object({ ok: z.boolean() })) } } },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/me",
    summary: "Get current user profile (session auth required)",
    responses: {
      200: { description: "Profile", content: { "application/json": { schema: dataEnvelope(userSchema.extend({ is_admin: z.boolean(), created_at: z.number() })) } } },
      401: { description: "Unauthenticated", content: { "application/json": { schema: errorSchema } } },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/me/teams",
    summary: "Create a team with 11 default players + default strategy",
    request: { body: { content: { "application/json": { schema: createTeamSchema } } } },
    responses: {
      201: { description: "Team created", content: { "application/json": { schema: dataEnvelope(teamSchema) } } },
      400: { description: "Validation failed", content: { "application/json": { schema: errorSchema } } },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/me/teams",
    summary: "List my teams",
    responses: {
      200: { description: "List of teams", content: { "application/json": { schema: dataEnvelope(z.array(teamSchema)) } } },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/me/teams/{id}",
    summary: "Get a team with its players and current strategy",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Team detail", content: { "application/json": { schema: dataEnvelope(teamDetailSchema) } } },
      404: { description: "Not found", content: { "application/json": { schema: errorSchema } } },
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/me/teams/{id}/strategy",
    summary: "Update a team's strategy (locked within 30 min of next match)",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: strategyPatchSchema } } },
    },
    responses: {
      200: { description: "Updated", content: { "application/json": { schema: dataEnvelope(strategySchema) } } },
      409: { description: "STRATEGY_LOCKED", content: { "application/json": { schema: errorSchema } } },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/me/api-keys",
    summary: "List my API keys (secrets never returned)",
    responses: {
      200: { description: "List", content: { "application/json": { schema: dataEnvelope(z.array(apiKeySchema)) } } },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/me/api-keys",
    summary: "Create an API key. Secret is returned only in this response.",
    request: { body: { content: { "application/json": { schema: apiKeyCreateSchema } } } },
    responses: {
      201: { description: "Created (with secret)", content: { "application/json": { schema: dataEnvelope(apiKeyWithSecretSchema) } } },
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/me/api-keys/{id}",
    summary: "Revoke an API key (soft delete)",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Revoked", content: { "application/json": { schema: dataEnvelope(z.object({ ok: z.boolean(), already_revoked: z.boolean().optional() })) } } },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/agent/me",
    summary: "Self-describe the AI agent (api key auth)",
    responses: {
      200: { description: "Agent context", content: { "application/json": { schema: dataEnvelope(agentMeSchema) } } },
      401: { description: "Unauthenticated", content: { "application/json": { schema: errorSchema } } },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/agent/team",
    summary: "Get my full team (api key auth)",
    responses: {
      200: { description: "Team detail", content: { "application/json": { schema: dataEnvelope(teamDetailSchema) } } },
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/agent/team/strategy",
    summary: "Update my team's strategy (api key auth, same lock rules)",
    request: { body: { content: { "application/json": { schema: strategyPatchSchema } } } },
    responses: {
      200: { description: "Updated", content: { "application/json": { schema: dataEnvelope(strategySchema) } } },
      409: { description: "STRATEGY_LOCKED", content: { "application/json": { schema: errorSchema } } },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/agent/matches/upcoming",
    summary: "List my upcoming matches (next 7 days)",
    responses: {
      200: { description: "Matches", content: { "application/json": { schema: dataEnvelope(z.array(matchSchema)) } } },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/agent/matches/{id}",
    summary: "Get a match by id (must involve my team)",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Match", content: { "application/json": { schema: dataEnvelope(matchSchema) } } },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/agent/matches/{id}/opponent",
    summary: "Get the opponent's team + players + strategy (no API keys leaked)",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Opponent", content: { "application/json": { schema: dataEnvelope(teamDetailSchema) } } },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/matches",
    summary: "List matches (optionally filtered by status, team_id)",
    request: {
      query: z.object({
        status: matchStatusSchema.optional(),
        team_id: z.string().uuid().optional(),
        limit: z.coerce.number().int().min(1).max(200).optional(),
      }),
    },
    responses: {
      200: { description: "Matches", content: { "application/json": { schema: dataEnvelope(z.array(matchSchema)) } } },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/matches/{id}",
    summary: "Get a match by id",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Match", content: { "application/json": { schema: dataEnvelope(matchSchema) } } },
      404: { description: "Not found", content: { "application/json": { schema: errorSchema } } },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/matches",
    summary: "Create a match (admin or self-service)",
    request: { body: { content: { "application/json": { schema: createMatchSchema } } } },
    responses: {
      201: { description: "Created", content: { "application/json": { schema: dataEnvelope(matchSchema) } } },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/matches/{id}/simulate",
    summary: "Run the match simulation (deterministic, updates ELO)",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Simulated", content: { "application/json": { schema: dataEnvelope(matchSchema) } } },
      409: { description: "ALREADY_SIMULATED", content: { "application/json": { schema: errorSchema } } },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/teams",
    summary: "List top teams by ELO (for leaderboard)",
    request: {
      query: z.object({ limit: z.coerce.number().int().min(1).max(200).optional() }),
    },
    responses: {
      200: { description: "Teams", content: { "application/json": { schema: dataEnvelope(z.array(teamWithOwnerSchema)) } } },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/teams/{id}",
    summary: "Public team profile (no API keys leaked)",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Team", content: { "application/json": { schema: dataEnvelope(teamSchema) } } },
    },
  });

  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "AI FIFA API",
      version: "0.1.0",
      description: [
        "API for the AI FIFA platform.",
        "",
        "**Auth**:",
        "- Human: `Authorization: Bearer <jwt>` or session cookie `aififa_session`",
        "- AI agent: `Authorization: Bearer aif_<secret>` (32-byte base64url)",
        "",
        "**Rate limits**: 120 req/min/key (agent), 30 req/min/user (session), 60 req/min/IP (public reads).",
        "",
        "**Common error codes**: `INVALID_INPUT`, `VALIDATION_FAILED`, `UNAUTHENTICATED`,",
        "`FORBIDDEN`, `KEY_REVOKED`, `TEAM_LOCKED`, `NOT_FOUND`, `CONFLICT`,",
        "`STRATEGY_LOCKED`, `ALREADY_SIMULATED`, `RATE_LIMITED`, `INTERNAL`.",
        "",
        "**Strategy lock**: Strategy updates are rejected with 409 STRATEGY_LOCKED if any of your team's",
        "upcoming matches kick off in ≤30 minutes.",
      ].join("\n"),
    },
    servers: [
      { url: "http://127.0.0.1:8787", description: "Local dev" },
      { url: "https://api.aififa.example.com", description: "Production" },
    ],
  });
}
