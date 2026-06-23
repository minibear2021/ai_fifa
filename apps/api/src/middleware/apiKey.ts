import type { Context, Next } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { createDb } from "../db/client.js";
import { apiKeys } from "../db/schema.js";
import { hashApiKey } from "../lib/auth/index.js";
import { errors } from "./error.js";
import type { AppContext } from "../bindings.js";

export async function apiKeyMiddleware(c: Context<AppContext>, next: Next) {
  const auth = c.req.header("Authorization");
  if (!auth || !auth.startsWith("Bearer aif_")) {
    await next();
    return;
  }
  const full = auth.slice("Bearer ".length).trim();
  if (!full.startsWith("aif_")) {
    await next();
    return;
  }
  const hash = await hashApiKey(full);
  const db = createDb(c.env.DB);
  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
    .limit(1);
  const key = rows[0];
  if (!key) {
    throw errors.unauthenticated();
  }
  c.set("apiKeyUserId", key.userId);
  c.set("apiKeyId", key.id);
  await db.update(apiKeys).set({ lastUsedAt: Date.now() }).where(eq(apiKeys.id, key.id));
  await next();
}

export function requireApiKey(c: Context<AppContext>): { userId: string; keyId: string } {
  const userId = c.get("apiKeyUserId");
  const keyId = c.get("apiKeyId");
  if (!userId || !keyId) throw errors.unauthenticated();
  return { userId, keyId };
}
