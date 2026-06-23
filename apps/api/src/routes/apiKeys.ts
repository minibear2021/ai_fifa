import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { createDb } from "../db/client.js";
import { apiKeys } from "../db/schema.js";
import { generateApiKey } from "../lib/auth/index.js";
import { errors } from "../middleware/error.js";
import { requireUser } from "../middleware/session.js";
import type { AppContext } from "../bindings.js";

const createKeySchema = z.object({
  label: z.string().min(1).max(64),
});

function toKeyResponse(row: typeof apiKeys.$inferSelect, secret?: string) {
  return {
    id: row.id,
    user_id: row.userId,
    label: row.label,
    key_prefix: row.keyPrefix,
    last_used_at: row.lastUsedAt,
    created_at: row.createdAt,
    revoked_at: row.revokedAt,
    ...(secret ? { secret } : {}),
  };
}

export const apiKeyRoutes = new Hono<AppContext>();

apiKeyRoutes.get("/api/v1/me/api-keys", async (c) => {
  const userId = requireUser(c);
  const db = createDb(c.env.DB);
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));
  return c.json({ data: rows.map((r) => toKeyResponse(r)) });
});

apiKeyRoutes.post("/api/v1/me/api-keys", async (c) => {
  const userId = requireUser(c);
  const body = await c.req.json().catch(() => null);
  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) throw errors.validationFailed(parsed.error.flatten());

  const db = createDb(c.env.DB);
  const generated = await generateApiKey();
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.insert(apiKeys).values({
    id,
    userId,
    label: parsed.data.label,
    keyHash: generated.hash,
    keyPrefix: generated.prefix,
    createdAt: now,
    revokedAt: null,
  });

  const row = (await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1))[0]!;
  return c.json({ data: toKeyResponse(row, generated.full) }, 201);
});

apiKeyRoutes.delete("/api/v1/me/api-keys/:id", async (c) => {
  const userId = requireUser(c);
  const keyId = c.req.param("id");
  const db = createDb(c.env.DB);

  const existing = (await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .limit(1))[0];

  if (!existing) throw errors.notFound("API key");
  if (existing.revokedAt) return c.json({ data: { ok: true, already_revoked: true } });

  await db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(eq(apiKeys.id, keyId));

  return c.json({ data: { ok: true } });
});
