import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

async function registerUser(displayName: string) {
  const email = uniqueEmail(displayName.toLowerCase());
  const password = "supersecret123";
  const res = await SELF.fetch("https://test.local/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name: displayName }),
  });
  const body = (await res.json()) as { data: { id: string; email: string } };
  return { res, body, email, password };
}

function readSessionCookie(setCookie: string | null): string {
  if (!setCookie) throw new Error("no Set-Cookie");
  const match = setCookie.match(/aififa_session=([^;]+)/);
  if (!match) throw new Error("no session cookie in: " + setCookie);
  return `aififa_session=${match[1]}`;
}

describe("auth flow", () => {
  it("registers, sets session cookie, and fetches /me", async () => {
    const { res, body, email } = await registerUser("Alice");
    expect(res.status).toBe(201);
    expect(body.data.email).toBe(email);
    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toMatch(/aififa_session=/);

    const me = await SELF.fetch("https://test.local/api/v1/me", {
      headers: { Cookie: readSessionCookie(setCookie) },
    });
    expect(me.status).toBe(200);
    const meBody = (await me.json()) as { data: { email: string } };
    expect(meBody.data.email).toBe(email);
  });

  it("rejects duplicate email with 409 CONFLICT", async () => {
    const email = uniqueEmail("dup");
    const password = "supersecret123";
    const first = await SELF.fetch("https://test.local/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, display_name: "Dup" }),
    });
    expect(first.status).toBe(201);
    const second = await SELF.fetch("https://test.local/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, display_name: "Dup" }),
    });
    expect(second.status).toBe(409);
    const body = (await second.json()) as { data: unknown; error: { code: string } };
    expect(body.data).toBeUndefined();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("rejects short password with 400", async () => {
    const res = await SELF.fetch("https://test.local/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: uniqueEmail("short"), password: "123", display_name: "X" }),
    });
    expect(res.status).toBe(400);
  });

  it("login with wrong password returns 400", async () => {
    const { email } = await registerUser("Bob");
    const res = await SELF.fetch("https://test.local/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "wrongpass1" }),
    });
    expect(res.status).toBe(400);
  });

  it("/me without cookie returns 401", async () => {
    const res = await SELF.fetch("https://test.local/api/v1/me");
    expect(res.status).toBe(401);
  });

  it("logout returns Set-Cookie that clears the session cookie", async () => {
    const { res } = await registerUser("Carol");
    const cookie = readSessionCookie(res.headers.get("Set-Cookie"));
    const logout = await SELF.fetch("https://test.local/api/v1/auth/logout", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(logout.status).toBe(200);
    const setCookie = logout.headers.get("Set-Cookie");
    expect(setCookie).toMatch(/aififa_session=;/);
  });
});
