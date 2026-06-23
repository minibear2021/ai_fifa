import type { Context, Next } from "hono";

export async function corsMiddleware(c: Context, next: Next) {
  const origin = c.env.ALLOWED_ORIGIN ?? "http://localhost:5173";
  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, Idempotency-Key");
  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Access-Control-Max-Age", "600");

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }
  await next();
}
