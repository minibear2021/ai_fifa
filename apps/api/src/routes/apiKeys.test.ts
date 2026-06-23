import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

async function registerAndGetCookie(displayName: string): Promise<string> {
  const res = await SELF.fetch("https://test.local/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: uniqueEmail(displayName.toLowerCase()),
      password: "supersecret123",
      display_name: displayName,
    }),
  });
  const setCookie = res.headers.get("Set-Cookie");
  if (!setCookie) throw new Error("no cookie");
  const match = setCookie.match(/aififa_session=([^;]+)/);
  if (!match) throw new Error("no session cookie");
  return `aififa_session=${match[1]}`;
}

describe("api key CRUD + agent middleware", () => {
  it("creates a key and returns the secret once", async () => {
    const cookie = await registerAndGetCookie("KeyHolder");
    const res = await SELF.fetch("https://test.local/api/v1/me/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ label: "test-agent" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { secret: string; key_prefix: string; id: string } };
    expect(body.data.secret).toMatch(/^aif_/);
    expect(body.data.key_prefix).toBe(body.data.secret.slice(0, 12));
  });

  it("lists keys without secret", async () => {
    const cookie = await registerAndGetCookie("Lister");
    await SELF.fetch("https://test.local/api/v1/me/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ label: "k1" }),
    });
    const res = await SELF.fetch("https://test.local/api/v1/me/api-keys", {
      headers: { Cookie: cookie },
    });
    const body = (await res.json()) as { data: Array<{ secret?: string; label: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.label).toBe("k1");
    expect(body.data[0]!.secret).toBeUndefined();
  });

  it("revokes a key and further auth attempts fail", async () => {
    const cookie = await registerAndGetCookie("Revoker");
    const create = await SELF.fetch("https://test.local/api/v1/me/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ label: "to-revoke" }),
    });
    const { data: key } = (await create.json()) as { data: { id: string; secret: string } };

    // Use the key to create a team via agent (will be implemented later; here just confirm it would work via /agent/me)
    const me = await SELF.fetch("https://test.local/api/v1/agent/me", {
      headers: { Authorization: `Bearer ${key.secret}` },
    });
    expect(me.status).toBe(200);

    // Revoke
    const del = await SELF.fetch(`https://test.local/api/v1/me/api-keys/${key.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(del.status).toBe(200);

    // Try again — should now 401
    const meAfter = await SELF.fetch("https://test.local/api/v1/agent/me", {
      headers: { Authorization: `Bearer ${key.secret}` },
    });
    expect(meAfter.status).toBe(401);
  });

  it("rejects invalid key with 401", async () => {
    const me = await SELF.fetch("https://test.local/api/v1/agent/me", {
      headers: { Authorization: "Bearer aif_invalidkey123" },
    });
    expect(me.status).toBe(401);
  });

  it("ignores non-aif bearer tokens (falls through to session)", async () => {
    const me = await SELF.fetch("https://test.local/api/v1/me", {
      headers: { Authorization: "Bearer not-an-api-key" },
    });
    expect(me.status).toBe(401);
  });
});
