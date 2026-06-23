import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

const env = {
  ENVIRONMENT: "test",
  ALLOWED_ORIGIN: "http://localhost:5173",
  JWT_SECRET: "test-secret-must-be-long-enough-for-hs256-32bytes",
  DB: {} as D1Database,
};

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

async function register(): Promise<string> {
  const res = await SELF.fetch("https://test.local/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: uniqueEmail("csrf"),
      password: "supersecret123",
      display_name: "CSRF",
    }),
  });
  const setCookie = res.headers.get("Set-Cookie")!;
  const m = setCookie.match(/aififa_session=([^;]+)/)!;
  return `aififa_session=${m[1]}`;
}

describe("CSRF middleware", () => {
  it("allows requests with matching Origin", async () => {
    const cookie = await register();
    const res = await SELF.fetch("https://test.local/api/v1/me/teams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ name: "OK" }),
    });
    expect(res.status).toBe(201);
  });

  it("rejects requests with mismatched Origin on write methods", async () => {
    const cookie = await register();
    const res = await SELF.fetch("https://test.local/api/v1/me/teams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: "https://evil.example.com",
      },
      body: JSON.stringify({ name: "Bad" }),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("allows requests without Origin (programmatic / server-to-server)", async () => {
    const cookie = await register();
    const res = await SELF.fetch("https://test.local/api/v1/me/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "NoOrigin" }),
    });
    expect(res.status).toBe(201);
  });

  it("does not check Origin on safe methods (GET)", async () => {
    const res = await SELF.fetch("https://test.local/api/v1/me", {
      headers: { Origin: "https://evil.example.com" },
    });
    expect(res.status).toBe(401);
  });
});
