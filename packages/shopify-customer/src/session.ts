import { EncryptJWT, jwtDecrypt } from "jose";
import type { TokenSet } from "./oauth";

export interface SessionPayload {
  customerId: string;
  email: string | null;
  tokens: TokenSet;
}

async function deriveKey(secret: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(secret);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

export const SESSION_COOKIE_NAME = "shuto_session";

export async function encryptSession(payload: SessionPayload, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  return new EncryptJWT({
    customerId: payload.customerId,
    email: payload.email,
    tokens: payload.tokens,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .encrypt(key);
}

export async function decryptSession(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  try {
    const key = await deriveKey(secret);
    const { payload } = await jwtDecrypt(token, key);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
