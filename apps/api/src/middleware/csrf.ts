import type { Context, Next } from "hono";
import { errors } from "./error.js";
import type { AppContext } from "../bindings.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function csrfMiddleware(c: Context<AppContext>, next: Next) {
  if (SAFE_METHODS.has(c.req.method)) {
    await next();
    return;
  }
  const allowed = c.env.ALLOWED_ORIGIN;
  if (!allowed) {
    await next();
    return;
  }
  const origin = c.req.header("Origin") ?? c.req.header("Referer") ?? null;
  // No Origin header → programmatic request (curl, server-to-server, test).
  // Treat as same-origin for simplicity; tighter CORS already restricts XHR.
  if (origin === null) {
    await next();
    return;
  }
  if (origin === allowed) {
    await next();
    return;
  }
  throw errors.forbidden("CSRF: origin mismatch");
}
