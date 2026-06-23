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

describe("teams CRUD", () => {
  it("creates a team with 11 default players and default strategy", async () => {
    const cookie = await registerAndGetCookie("Coach");
    const res = await SELF.fetch("https://test.local/api/v1/me/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Red Lions", formation: "4-4-2" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; name: string; formation: string; rating: number } };
    expect(body.data.name).toBe("Red Lions");
    expect(body.data.formation).toBe("4-4-2");
    expect(body.data.rating).toBe(1500);

    const detail = await SELF.fetch(`https://test.local/api/v1/me/teams/${body.data.id}`, {
      headers: { Cookie: cookie },
    });
    expect(detail.status).toBe(200);
    const detailBody = (await detail.json()) as {
      data: {
        team: { name: string };
        players: Array<{ position: string; overall: number }>;
        strategy: { style: string; mentality: string } | null;
      };
    };
    expect(detailBody.data.players).toHaveLength(11);
    const positions = detailBody.data.players.map((p) => p.position).sort();
    expect(positions).toEqual(["DF", "DF", "DF", "DF", "FW", "FW", "GK", "MF", "MF", "MF", "MF"]);
    expect(detailBody.data.strategy).not.toBeNull();
    expect(detailBody.data.strategy!.style).toBe("possession");
  });

  it("lists my teams", async () => {
    const cookie = await registerAndGetCookie("Lister");
    await SELF.fetch("https://test.local/api/v1/me/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Alpha" }),
    });
    await SELF.fetch("https://test.local/api/v1/me/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Beta" }),
    });
    const res = await SELF.fetch("https://test.local/api/v1/me/teams", { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ name: string }> };
    const names = body.data.map((t) => t.name).sort();
    expect(names).toEqual(["Alpha", "Beta"]);
  });

  it("updates strategy when no match is upcoming within 30 min", async () => {
    const cookie = await registerAndGetCookie("Tactician");
    const create = await SELF.fetch("https://test.local/api/v1/me/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Tactics FC" }),
    });
    const { data: team } = (await create.json()) as { data: { id: string } };

    const res = await SELF.fetch(`https://test.local/api/v1/me/teams/${team.id}/strategy`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        formation: "4-3-3",
        style: "pressing",
        mentality: "attacking",
        pressing: 80,
        passing_risk: 70,
        width: 60,
        fouls_tactical: true,
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { style: string; mentality: string; pressing: number } };
    expect(body.data.style).toBe("pressing");
    expect(body.data.mentality).toBe("attacking");
    expect(body.data.pressing).toBe(80);
  });

  it("rejects strategy update with invalid value", async () => {
    const cookie = await registerAndGetCookie("Validator");
    const create = await SELF.fetch("https://test.local/api/v1/me/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "X" }),
    });
    const { data: team } = (await create.json()) as { data: { id: string } };

    const res = await SELF.fetch(`https://test.local/api/v1/me/teams/${team.id}/strategy`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ pressing: 200 }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 401 for unauthenticated team creation", async () => {
    const res = await SELF.fetch("https://test.local/api/v1/me/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    expect(res.status).toBe(401);
  });
});
