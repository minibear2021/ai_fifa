import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { setCookie, deleteCookie } from "hono/cookie";
import { createDb } from "../db/client.js";
import { users } from "../db/schema.js";
import { hashPassword, verifyPassword, signSession, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from "../lib/auth/index.js";
import { errors } from "../middleware/error.js";
import { requireUser } from "../middleware/session.js";
import type { AppContext } from "../bindings.js";

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  display_name: z.string().min(1).max(64),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

const COOKIE_BASE = {
  httpOnly: true,
  secure: true,
  sameSite: "Lax" as const,
  path: "/",
};

export const authRoutes = new Hono<AppContext>();

authRoutes.post("/api/v1/auth/register", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) throw errors.validationFailed(parsed.error.flatten());

  const { email, password, display_name } = parsed.data;
  const db = createDb(c.env.DB);

  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) throw errors.conflict("EMAIL_TAKEN", "Email already registered");

  try {
    const passwordHash = await hashPassword(password);
    const id = crypto.randomUUID();
    await db.insert(users).values({
      id,
      email: email.toLowerCase(),
      passwordHash,
      displayName: display_name,
      createdAt: Date.now(),
      isAdmin: false,
    });

    const token = await signSession(id, c.env.JWT_SECRET);
    setCookie(c, SESSION_COOKIE_NAME, token, { ...COOKIE_BASE, maxAge: SESSION_COOKIE_MAX_AGE });

    return c.json({ data: { id, email: email.toLowerCase(), display_name } }, 201);
  } catch (err) {
    console.error("register failed at:", err instanceof Error ? err.message : String(err), err);
    throw err;
  }
});

authRoutes.post("/api/v1/auth/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) throw errors.validationFailed(parsed.error.flatten());

  const { email, password } = parsed.data;
  const db = createDb(c.env.DB);
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  const user = rows[0];
  if (!user) throw errors.invalidInput("Invalid email or password");

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw errors.invalidInput("Invalid email or password");

  const token = await signSession(user.id, c.env.JWT_SECRET);
  setCookie(c, SESSION_COOKIE_NAME, token, { ...COOKIE_BASE, maxAge: SESSION_COOKIE_MAX_AGE });

  return c.json({
    data: { id: user.id, email: user.email, display_name: user.displayName },
  });
});

authRoutes.post("/api/v1/auth/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
  return c.json({ data: { ok: true } });
});

authRoutes.get("/api/v1/me", async (c) => {
  const userId = requireUser(c);
  const db = createDb(c.env.DB);
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user) throw errors.notFound("User");
  return c.json({
    data: { id: user.id, email: user.email, display_name: user.displayName, is_admin: user.isAdmin, created_at: user.createdAt },
  });
});
