import type { Context, Next } from "hono";
import { verifySession, SESSION_COOKIE_NAME } from "../lib/auth/index.js";
import { errors } from "./error.js";
import type { AppContext } from "../bindings.js";

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

async function extractSession(c: Context<AppContext>): Promise<string | null> {
  const auth = c.req.header("Authorization");
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }
  return readCookie(c.req.header("Cookie") ?? null, SESSION_COOKIE_NAME);
}

export async function sessionMiddleware(c: Context<AppContext>, next: Next) {
  const token = await extractSession(c);
  if (!token) {
    await next();
    return;
  }
  const payload = await verifySession(token, c.env.JWT_SECRET);
  if (payload?.sub) {
    c.set("userId", payload.sub);
  }
  await next();
}

export function requireUser(c: Context<AppContext>): string {
  const userId = c.get("userId");
  if (!userId) throw errors.unauthenticated();
  return userId;
}