/**
 * specs.ts — Production : fan-out de specs + gate d'usage DÉTERMINISTE (ADR-0111).
 *
 * PUR, zéro LLM, zéro I/O. Le fan-out mappe des LIGNES du catalogue
 * `ChannelSpecReference` (seedé) vers des specs de livrable ; le gate d'usage
 * décide si un livrable est diffusable (droits non expirés). Le « maintenant »
 * est TOUJOURS un paramètre explicite (`asOf`) — pas de dépendance temporelle
 * cachée, testable au jour près.
 */

/** Ligne du catalogue de specs (telle que stockée en base). */
export interface ChannelSpecRow {
  key: string;
  channel: string;
  aspectRatio: string | null;
  resolution: string | null;
  durationSec: number | null;
  codec: string | null;
  frameRate: number | null;
  loudnessTarget: string | null;
  captionRequired: boolean;
  fileFormat: string | null;
  maxFileMb: number | null;
}

/** Spec de livrable dérivée (prête à persister), sans champs DB. */
export interface DerivedDeliverableSpec {
  channelSpecKey: string;
  channel: string;
  aspectRatio: string | null;
  resolution: string | null;
  durationSec: number | null;
  codec: string | null;
  frameRate: number | null;
  loudnessTarget: string | null;
  captionRequired: boolean;
  fileFormat: string | null;
  maxFileMb: number | null;
}

/** Mappe une ligne catalogue → spec de livrable. PUR. */
export function deriveSpecFromChannel(row: ChannelSpecRow): DerivedDeliverableSpec {
  return {
    channelSpecKey: row.key,
    channel: row.channel,
    aspectRatio: row.aspectRatio,
    resolution: row.resolution,
    durationSec: row.durationSec,
    codec: row.codec,
    frameRate: row.frameRate,
    loudnessTarget: row.loudnessTarget,
    captionRequired: row.captionRequired,
    fileFormat: row.fileFormat,
    maxFileMb: row.maxFileMb,
  };
}

/**
 * Calcule la date d'expiration d'un droit d'usage : `termStart` + `termMonths`.
 * PUR (n'utilise pas l'horloge — opère sur la date fournie).
 */
export function computeGrantExpiry(termStart: Date, termMonths: number): Date {
  const d = new Date(termStart.getTime());
  d.setMonth(d.getMonth() + termMonths);
  return d;
}

export interface GrantLike {
  expiresAt: Date;
  status: string; // ACTIVE|EXPIRED|REVOKED
}

/**
 * Gate d'usage : un livrable est diffusable ssi AU MOINS un droit d'usage est
 * ACTIVE et non expiré à la date `asOf`. PUR. Isomorphe au pattern `staleAt`.
 * Renvoie aussi pourquoi (diagnostic — facilite le triage).
 */
export function isDiffusionAllowed(
  grants: GrantLike[],
  asOf: Date,
): { allowed: boolean; reason: "OK" | "NO_GRANT" | "ALL_EXPIRED_OR_REVOKED" } {
  if (grants.length === 0) return { allowed: false, reason: "NO_GRANT" };
  const live = grants.some((g) => g.status === "ACTIVE" && g.expiresAt.getTime() > asOf.getTime());
  return live ? { allowed: true, reason: "OK" } : { allowed: false, reason: "ALL_EXPIRED_OR_REVOKED" };
}

/** Vrai si CE droit est actif à `asOf`. PUR. */
export function isUsageGrantActive(grant: GrantLike, asOf: Date): boolean {
  return grant.status === "ACTIVE" && grant.expiresAt.getTime() > asOf.getTime();
}
