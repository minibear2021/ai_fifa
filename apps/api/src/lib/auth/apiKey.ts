const PREFIX = "aif_";
const SECRET_BYTES = 32;

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(s: string): Uint8Array {
  const padded = s.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toBase64Url(new Uint8Array(digest));
}

export type GeneratedApiKey = {
  full: string;
  prefix: string;
  hash: string;
};

export async function generateApiKey(): Promise<GeneratedApiKey> {
  const random = crypto.getRandomValues(new Uint8Array(SECRET_BYTES));
  const secret = toBase64Url(random);
  const full = `${PREFIX}${secret}`;
  const prefix = full.slice(0, 12);
  const hash = await sha256(full);
  return { full, prefix, hash };
}

export async function hashApiKey(full: string): Promise<string> {
  return sha256(full);
}

export { fromBase64Url, toBase64Url };
