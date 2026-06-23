import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ISSUER = "ai-fifa";
const AUDIENCE = "ai-fifa-web";
const ALG = "HS256";
const TTL_SECONDS = 7 * 24 * 60 * 60;

export type SessionPayload = JWTPayload & {
  sub: string;
};

function getKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSession(userId: string, secret: string): Promise<string> {
  return await new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getKey(secret));
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload.sub !== "string") return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = "aififa_session";
export const SESSION_COOKIE_MAX_AGE = TTL_SECONDS;
