// Free plan Cloudflare Workers has only 10ms CPU time per request.
// PBKDF2 with 600k iterations takes ~500ms+ CPU — exceeds the limit.
//
// Trade-off: we use a single SHA-256 round with a random per-user salt
// PLUS a server-side pepper. This:
//   - Runs in <1ms (fits Free plan)
//   - Defends against database-only leaks (would need both DB and the
//     pepper secret to brute-force)
//   - Documented as "non-PBKDF2; upgrade on Paid plan"
//
// To upgrade: re-import argon2id via @noble/hashes or move to a paid plan
// and switch back to PBKDF2 with 600k iterations.

const HASH = "SHA-256";
const SALT_LEN = 16;
const PEPPER = "ai-fifa-static-pepper-v1-rotate-in-production";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function digest(salt: Uint8Array, password: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const data = new Uint8Array(salt.length + PEPPER.length + password.length);
  data.set(salt, 0);
  data.set(enc.encode(PEPPER), salt.length);
  data.set(enc.encode(password), salt.length + PEPPER.length);
  const hash = await crypto.subtle.digest(HASH, data);
  return new Uint8Array(hash);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const hash = await digest(salt, password);
  return `sha256$${toHex(salt)}$${toHex(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "sha256") return false;
  const salt = fromHex(parts[1]!);
  const expected = fromHex(parts[2]!);
  const actual = await digest(salt, password);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual[i]! ^ expected[i]!;
  }
  return diff === 0;
}
