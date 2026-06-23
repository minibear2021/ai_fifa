import { describe, it, expect } from "vitest";
import { seedFromMatchId } from "./seed.js";

describe("seedFromMatchId", () => {
  it("returns the same seed for the same matchId", () => {
    const a = seedFromMatchId("match-abc-123");
    const b = seedFromMatchId("match-abc-123");
    expect(a).toBe(b);
  });

  it("returns different seeds for different matchIds", () => {
    expect(seedFromMatchId("m1")).not.toBe(seedFromMatchId("m2"));
  });

  it("returns a 32-bit unsigned integer", () => {
    const s = seedFromMatchId("hello");
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
    expect(Number.isInteger(s)).toBe(true);
  });

  it("handles empty string", () => {
    const s = seedFromMatchId("");
    expect(s).toBe(2166136261);
  });
});
