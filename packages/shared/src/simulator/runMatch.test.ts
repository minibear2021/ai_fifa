import { describe, it, expect } from "vitest";
import { runMatch } from "./runMatch.js";
import { mulberry32 } from "./rng.js";
import { seedFromMatchId } from "./seed.js";
import type { MatchInput, TeamSnapshot } from "./types.js";
import type { Player, Strategy } from "../schemas/index.js";

function makePlayer(position: Player["position"], i: number, overall: number): Player {
  return {
    id: `p-${position}-${i}`,
    team_id: "t",
    name: `${position}${i}`,
    position,
    pace: overall,
    shooting: overall,
    passing: overall,
    defending: overall,
    stamina: overall,
    overall,
  };
}

function makeTeam(id: string, overall: number, isHome: boolean): TeamSnapshot {
  return {
    id,
    name: id,
    rating: 1500,
    isHome,
    players: [
      ...Array.from({ length: 1 }, (_, i) => makePlayer("GK", i, overall)),
      ...Array.from({ length: 4 }, (_, i) => makePlayer("DF", i, overall)),
      ...Array.from({ length: 4 }, (_, i) => makePlayer("MF", i, overall)),
      ...Array.from({ length: 2 }, (_, i) => makePlayer("FW", i, overall)),
    ],
  };
}

function defaultStrategy(): Strategy {
  return {
    team_id: "t",
    formation: "4-4-2",
    style: "possession",
    mentality: "balanced",
    pressing: 50,
    passing_risk: 50,
    width: 50,
    fouls_tactical: false,
    updated_at: 0,
  };
}

function makeInput(homeOverall: number, awayOverall: number, matchId: string): MatchInput {
  return {
    matchId,
    home: makeTeam("home", homeOverall, true),
    away: makeTeam("away", awayOverall, false),
    homeStrategy: defaultStrategy(),
    awayStrategy: defaultStrategy(),
  };
}

describe("runMatch (real algorithm)", () => {
  it("is deterministic for the same input + rng", () => {
    const input = makeInput(70, 70, "match-deterministic");
    const a = runMatch(input, mulberry32(seedFromMatchId(input.matchId)));
    const b = runMatch(input, mulberry32(seedFromMatchId(input.matchId)));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("produces kickoff/halftime/fulltime events", () => {
    const out = runMatch(makeInput(70, 70, "match-events"), mulberry32(1));
    const types = out.events.map((e) => e.type);
    expect(types).toContain("kickoff");
    expect(types).toContain("halftime");
    expect(types).toContain("fulltime");
  });

  it("stronger home team wins more often across many matches", () => {
    const wins = 0;
    let draws = 0;
    let homeWins = 0;
    let awayWins = 0;
    const N = 100;
    for (let i = 0; i < N; i++) {
      const input = makeInput(85, 65, `match-${i}`);
      const out = runMatch(input, mulberry32(seedFromMatchId(input.matchId)));
      if (out.finalScore[0] > out.finalScore[1]) homeWins++;
      else if (out.finalScore[0] < out.finalScore[1]) awayWins++;
      else draws++;
    }
    expect(homeWins).toBeGreaterThan(awayWins);
    expect(homeWins).toBeGreaterThan(N * 0.4);
    void wins;
  });

  it("equal teams have a home win rate within 20-45% (draws dominate)", () => {
    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const input = makeInput(70, 70, `match-equal-${i}`);
      const out = runMatch(input, mulberry32(seedFromMatchId(input.matchId)));
      if (out.finalScore[0] > out.finalScore[1]) homeWins++;
      else if (out.finalScore[0] < out.finalScore[1]) awayWins++;
      else draws++;
    }
    const homeRate = homeWins / N;
    const awayRate = awayWins / N;
    const drawRate = draws / N;
    expect(homeRate).toBeGreaterThan(0.2);
    expect(homeRate).toBeLessThan(0.45);
    expect(homeRate).toBeGreaterThan(awayRate);
    expect(drawRate).toBeGreaterThan(0.2);
  });

  it("possesses matches Math.random/Date.now nowhere in the body", () => {
    const source = runMatch.toString();
    expect(source).not.toMatch(/Date\.now/);
    expect(source).not.toMatch(/Math\.random/);
  });

  it("events are time-ordered", () => {
    const out = runMatch(makeInput(70, 70, "match-ordered"), mulberry32(42));
    for (let i = 1; i < out.events.length; i++) {
      expect(out.events[i]!.t).toBeGreaterThanOrEqual(out.events[i - 1]!.t);
    }
  });
});
