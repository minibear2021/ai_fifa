import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./passwords.js";

describe("passwords", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).toMatch(/^pbkdf2\$600000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("right");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces different hashes for the same input (random salt)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
  });

  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("any", "not-a-valid-format")).toBe(false);
    expect(await verifyPassword("any", "pbkdf2$0$salt$hash")).toBe(false);
    expect(await verifyPassword("any", "wrongalgo$100000$salt$hash")).toBe(false);
  });
});
