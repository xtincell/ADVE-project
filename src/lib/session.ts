import { cookies } from "next/headers";
import {
  getAuthSecretKey,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./session-token";

/**
 * Session — plomberie cookie côté serveur (Server Components, server actions,
 * route handlers). Server-only de fait : `cookies()` vient de next/headers.
 * Le middleware, lui, lit le cookie via NextRequest + session-token.ts.
 *
 * Cookie httpOnly `lf_session`, 30 jours, JWT HS256 (AUTH_SECRET).
 */

export type { SessionPayload };

/** Pose le cookie de session (post-login / post-inscription). */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload, getAuthSecretKey());
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Session courante, ou null (absent, expiré, falsifié — jamais de throw). */
export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token, getAuthSecretKey());
}

/** Déconnexion — supprime le cookie. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
}
