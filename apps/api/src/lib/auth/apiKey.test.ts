import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey } from "./apiKey.js";

describe("apiKey", () => {
  it("generates a prefixed key with separate hash and prefix", async () => {
    const k = await generateApiKey();
    expect(k.full).toMatch(/^aif_[A-Za-z0-9_-]{40,50}$/);
    expect(k.prefix).toBe(k.full.slice(0, 12));
    expect(k.hash).not.toBe(k.full);
    expect(k.hash.length).toBeGreaterThan(20);
  });

  it("hash is stable for the same input", async () => {
    const h1 = await hashApiKey("aif_abc");
    const h2 = await hashApiKey("aif_abc");
    expect(h1).toBe(h2);
  });

  it("hash differs for different inputs", async () => {
    const h1 = await hashApiKey("aif_abc");
    const h2 = await hashApiKey("aif_abd");
    expect(h1).not.toBe(h2);
  });

  it("generated keys are unique", async () => {
    const a = await generateApiKey();
    const b = await generateApiKey();
    expect(a.full).not.toBe(b.full);
  });
});
