/** Short-lived access to ONE reviewed export for the existing social transport. */
import { createHmac, timingSafeEqual } from "node:crypto";

const ttl = 10 * 60;
function signingKey() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error("Signature des médias de publication non configurée.");
  return secret;
}
function digest(id: string, hash: string, expires: number) {
  return createHmac("sha256", signingKey()).update(JSON.stringify(["publication-image-v1", id, hash, expires])).digest("hex");
}
export function publicationMediaUrl(id: string, hash: string, now = Date.now()) {
  const base = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL;
  if (!base) throw new Error("Adresse publique de publication non configurée.");
  const url = new URL(`/api/production/publication/${encodeURIComponent(id)}`, base);
  if (url.username || url.password || (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))))
    throw new Error("Une adresse HTTPS est requise pour transmettre le média.");
  const expires = Math.floor(now / 1000) + ttl;
  url.search = new URLSearchParams({ hash, expires: String(expires), signature: digest(id, hash, expires) }).toString();
  return url.toString();
}
export function verifyPublicationMediaGrant(id: string, query: URLSearchParams, now = Date.now()): string | null {
  const hash = query.get("hash") ?? "", signature = query.get("signature") ?? "", expires = Number(query.get("expires"));
  const seconds = Math.floor(now / 1000);
  if (!/^[a-f0-9]{64}$/.test(hash) || !/^[a-f0-9]{64}$/.test(signature) || !Number.isSafeInteger(expires) || expires <= seconds || expires > seconds + ttl) return null;
  const expected = digest(id, hash, expires);
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? hash : null;
}
