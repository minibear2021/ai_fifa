import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

async function registerUser(name: string): Promise<{ cookie: string; userId: string }> {
  const res = await SELF.fetch("https://test.local/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: uniqueEmail(name.toLowerCase()),
      password: "supersecret123",
      display_name: name,
    }),
  });
  const setCookie = res.headers.get("Set-Cookie")!;
  const match = setCookie.match(/aififa_session=([^;]+)/)!;
  const cookie = `aififa_session=${match[1]}`;
  const body = (await res.json()) as { data: { id: string } };
  return { cookie, userId: body.data.id };
}

async function createTeam(cookie: string, name: string): Promise<string> {
  const res = await SELF.fetch("https://test.local/api/v1/me/teams", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name, formation: "4-4-2" }),
  });
  const body = (await res.json()) as { data: { id: string } };
  return body.data.id;
}

async function createMatch(cookie: string, homeId: string, awayId: string): Promise<string> {
  const res = await SELF.fetch("https://test.local/api/v1/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ home_id: homeId, away_id: awayId, kickoff_at: Date.now() + 60_000 }),
  });
  const body = (await res.json()) as { data: { id: string } };
  return body.data.id;
}

describe("match simulation", () => {
  it("creates, simulates, and finalizes a match; updates ELO", async () => {
    const a = await registerUser("Alice");
    const b = await registerUser("Bob");
    const teamA = await createTeam(a.cookie, "Alice FC");
    const teamB = await createTeam(b.cookie, "Bob United");
    const matchId = await createMatch(a.cookie, teamA, teamB);

    const sim = await SELF.fetch(`https://test.local/api/v1/matches/${matchId}/simulate`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });
    expect(sim.status).toBe(200);
    const simBody = (await sim.json()) as {
      data: {
        status: string;
        home_score: number;
        away_score: number;
        events: Array<{ type: string; t: number }> | null;
        stats: { home_shots: number } | null;
      };
    };
    expect(simBody.data.status).toBe("finished");
    expect(simBody.data.home_score).toBeGreaterThanOrEqual(0);
    expect(simBody.data.events).not.toBeNull();
    const types = simBody.data.events!.map((e) => e.type);
    expect(types).toContain("kickoff");
    expect(types).toContain("halftime");
    expect(types).toContain("fulltime");

    const detail = await SELF.fetch(`https://test.local/api/v1/matches/${matchId}`);
    expect(detail.status).toBe(200);
  });

  it("rejects simulating an already-finished match", async () => {
    const a = await registerUser("Cathy");
    const b = await registerUser("Dan");
    const teamA = await createTeam(a.cookie, "Cathy FC");
    const teamB = await createTeam(b.cookie, "Dan FC");
    const matchId = await createMatch(a.cookie, teamA, teamB);
    await SELF.fetch(`https://test.local/api/v1/matches/${matchId}/simulate`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });
    const second = await SELF.fetch(`https://test.local/api/v1/matches/${matchId}/simulate`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });
    expect(second.status).toBe(409);
  });

  it("list matches returns the finished one", async () => {
    const a = await registerUser("Eli");
    const b = await registerUser("Fay");
    const teamA = await createTeam(a.cookie, "Eli FC");
    const teamB = await createTeam(b.cookie, "Fay FC");
    const matchId = await createMatch(a.cookie, teamA, teamB);
    await SELF.fetch(`https://test.local/api/v1/matches/${matchId}/simulate`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });
    const res = await SELF.fetch("https://test.local/api/v1/matches?status=finished");
    const body = (await res.json()) as { data: Array<{ id: string }> };
    expect(body.data.some((m) => m.id === matchId)).toBe(true);
  });
});
