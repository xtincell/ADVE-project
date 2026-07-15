/**
 * ADR-0147 — chiffrement PII de l'Identity Graph.
 *
 * Deux primitives, une seule clé (env `INTEGRATION_TOKEN_KEY`, même dérivation que
 * les tokens OAuth — `sha256(key)`), zéro dépendance externe :
 *  - `hashForMatch`   : HMAC-SHA256 DÉTERMINISTE de la clé logique normalisée →
 *                       stable, indexable, irréversible. Sert à MATCHER.
 *  - `encryptForDisplay` / `decryptDisplay` : AES-256-GCM (iv aléatoire) → sert à
 *                       AFFICHER à l'opérateur. La valeur en clair n'est jamais
 *                       persistée, jamais mise dans une IntentEmission.
 */

import crypto from "node:crypto";

function derivedKey(): Buffer {
  const raw = process.env.INTEGRATION_TOKEN_KEY ?? "";
  if (raw.length < 32) {
    throw new Error(
      "INTEGRATION_TOKEN_KEY must be at least 32 characters (PII crypto, ADR-0147)",
    );
  }
  return crypto.createHash("sha256").update(raw).digest();
}

/** HMAC-SHA256(clé, cléLogique) → hex. Déterministe (même entrée = même sortie). */
export function hashForMatch(logicalKey: string): string {
  return crypto.createHmac("sha256", derivedKey()).update(logicalKey).digest("hex");
}

/** AES-256-GCM → base64 `iv.tag.ciphertext`. IV aléatoire (12o). */
export function encryptForDisplay(plaintext: string): string {
  const key = derivedKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

/** Déchiffre un cipher produit par `encryptForDisplay`. Renvoie null si corrompu. */
export function decryptDisplay(encoded: string | null | undefined): string | null {
  if (!encoded) return null;
  try {
    const [ivB64, tagB64, ctB64] = encoded.split(".");
    if (!ivB64 || !tagB64 || !ctB64) return null;
    const key = derivedKey();
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const pt = Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64")),
      decipher.final(),
    ]);
    return pt.toString("utf8");
  } catch {
    return null;
  }
}
