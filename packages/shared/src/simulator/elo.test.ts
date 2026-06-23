import { describe, it, expect } from "vitest";
import { updateElo } from "./elo.js";

describe("updateElo", () => {
  it("home win: home rating up, away rating down", () => {
    const r = updateElo(1500, 1500, 2, 1);
    expect(r.newHome).toBeGreaterThan(1500);
    expect(r.newAway).toBeLessThan(1500);
  });

  it("draw: equal ratings unchanged", () => {
    const r = updateElo(1500, 1500, 1, 1);
    expect(r.newHome).toBe(1500);
    expect(r.newAway).toBe(1500);
  });

  it("underdog upset: lower-rated winner gains more than equal-rated winner", () => {
    const balanced = updateElo(1500, 1500, 3, 0);
    const upset = updateElo(1400, 1600, 3, 0);
    expect(upset.newHome).toBeGreaterThan(1400);
    expect(upset.newAway).toBeLessThan(1600);
    expect(upset.newHome - 1400).toBeGreaterThan(balanced.newHome - 1500);
  });

  it("margin >= 2 increases K factor (more rating change)", () => {
    const tight = updateElo(1500, 1500, 1, 0, 32);
    const big = updateElo(1500, 1500, 3, 0, 32);
    expect(Math.abs(big.newHome - 1500)).toBeGreaterThan(Math.abs(tight.newHome - 1500));
  });

  it("symmetric: swapping home/away mirrors the result", () => {
    const a = updateElo(1500, 1500, 2, 1);
    const b = updateElo(1500, 1500, 1, 2);
    expect(a.newHome).toBe(b.newAway);
    expect(a.newAway).toBe(b.newHome);
  });
});
