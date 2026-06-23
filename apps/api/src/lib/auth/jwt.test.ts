import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "./jwt.js";

const SECRET = "test-secret-must-be-long-enough-for-hs256-32bytes";

describe("jwt session", () => {
  it("signs and verifies a session", async () => {
    const token = await signSession("user-123", SECRET);
    const payload = await verifySession(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe("user-123");
  });

  it("rejects token signed with a different secret", async () => {
    const token = await signSession("user-123", SECRET);
    const payload = await verifySession(token, "different-secret-must-also-be-long-enough");
    expect(payload).toBeNull();
  });

  it("rejects garbage tokens", async () => {
    expect(await verifySession("not-a-jwt", SECRET)).toBeNull();
    expect(await verifySession("", SECRET)).toBeNull();
  });
});
