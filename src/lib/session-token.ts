import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

/**
 * Jeton de session — partie PURE et edge-safe (jose = WebCrypto, zéro import
 * Next/Node). Consommée par :
 *   - src/lib/session.ts   (cookies() côté Server Components / actions)
 *   - src/middleware.ts    (NextRequest.cookies, runtime edge ou node)
 *   - tests/session.test.ts (secret de test, pas de DB)
 */

export const SESSION_COOKIE_NAME = "lf_session";
/** 30 jours — durée de vie du cookie ET du JWT. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const JWT_ALG = "HS256";

/**
 * Payload de session. `workspaceKind` s'ajoute au trio {userId, workspaceId,
 * role} : le middleware doit décider « OWNER d'un workspace AGENCY » sans
 * toucher la DB (consigne WP-003) — l'information doit donc voyager dans le JWT.
 */
export const sessionPayloadSchema = z.object({
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
  role: z.enum(["OWNER", "OPERATOR", "MEMBER", "CLIENT"]),
  workspaceKind: z.enum(["AGENCY", "BRAND"]),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

/** Le payload autorise-t-il l'espace /admin ? (OPERATOR, ou OWNER d'une AGENCY.) */
export function isAdminSession(session: SessionPayload): boolean {
  return (
    session.role === "OPERATOR" ||
    (session.role === "OWNER" && session.workspaceKind === "AGENCY")
  );
}

/** Secret dev par défaut — JAMAIS accepté en production (throw explicite). */
const DEV_FALLBACK_SECRET = "lafusee-dev-secret-non-production";

/**
 * Résout la clé HMAC depuis AUTH_SECRET. Appelée au runtime uniquement
 * (jamais au module-load) → le build sans AUTH_SECRET reste vert.
 */
export function getAuthSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET manquant en production — refus de signer des sessions avec un secret connu.",
      );
    }
    return new TextEncoder().encode(DEV_FALLBACK_SECRET);
  }
  return new TextEncoder().encode(secret);
}

/** Signe un JWT HS256 portant le payload de session. */
export async function signSessionToken(
  payload: SessionPayload,
  secret: Uint8Array,
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + maxAgeSeconds)
    .sign(secret);
}

/**
 * Vérifie signature + expiration + FORME du payload (Zod — un JWT est une
 * entrée externe). Retourne null sur tout token invalide, jamais de throw.
 */
export async function verifySessionToken(
  token: string,
  secret: Uint8Array,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [JWT_ALG] });
    const parsed = sessionPayloadSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null; // signature invalide, token expiré, malformé…
  }
}
