import { describe, it, expect } from "vitest";
import { mulberry32 } from "./rng.js";

describe("mulberry32", () => {
  it("returns values in [0, 1)", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is deterministic for the same seed", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });

  it("produces different streams for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const aValues = Array.from({ length: 10 }, () => a());
    const bValues = Array.from({ length: 10 }, () => b());
    expect(aValues).not.toEqual(bValues);
  });
});
