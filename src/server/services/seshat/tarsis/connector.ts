/**
 * Tarsis — connecteur de signaux sectoriels (sous-domaine Seshat). ADR-0079,
 * Pattern P22-1 (`ConnectorResult<T>`), **de-mocké 2026-06-14 (ADR-0100 suite)**.
 *
 * # Mise au point doctrinale (fin de la fiction « vendor contract »)
 *
 * Tarsis n'est PAS une API tierce : c'est le monitoring de signaux faibles DE
 * LA FUSÉE (sous-domaine Seshat, nommé d'après le thème Neteru). Le code antérieur
 * le modélisait comme un « Tarsis-monitoring API vendor » exigeant un contrat +
 * des credentials + un SDK, et renvoyait un payload `_mocked: true` vide en
 * attendant. Aucun contrat n'est requis : les signaux se dérivent de sources
 * RÉELLES et possédées/gratuites — d'abord les digests `EXTERNAL_FEED_DIGEST`
 * (flux RSS réels, cf. external-feeds). Une credential `tarsis-monitoring`
 * devient OPTIONNELLE (enrichissement social-listening premium futur), jamais
 * un prérequis du socle.
 *
 * # Contrat
 *
 * `fetchSectorSignal(operatorId, sectorSlug, scope?)` → `ConnectorResult<TarsisSignal>` :
 *   - `LIVE`     — signal réel dérivé des digests RSS du secteur (`_mocked:false`).
 *   - `DEGRADED + INSUFFICIENT_DATA` — aucun digest exploitable (PAS de zéro
 *     silencieux : on dégrade, on n'invente pas — P22-1 + ADR-0046).
 *   - `DEGRADED + VENDOR_OUTAGE` — erreur transitoire (DB, etc.).
 * Plus de branche `DEFERRED_AWAITING_CREDENTIALS` : le socle ne dépend plus d'une
 * clé. Les consommateurs (`sector-intelligence/`) gèrent déjà LIVE/DEGRADED.
 *
 * Le digest propre à la marque est prioritaire. Les articles sectoriels restent
 * distincts de mentions spontanées de la marque : aucun gain de réputation
 * ni déplacement Overton n’est déduit de leur seule présence.
 *
 * Cap APOGEE 7/7 préservé — connecteur, pas un Neter.
 */

import { db } from "@/lib/db";
import type { ConnectorResult, OvertonSectorArticle } from "@/domain";

/** Slug Vault (credential OPTIONNELLE — enrichissement premium futur). */
export const TARSIS_CONNECTOR_TYPE = "tarsis-monitoring" as const;
export const TARSIS_DISPLAY_NAME = "Tarsis (monitoring signaux faibles — La Fusée)";

/** Payload sectoriel. Champs optionnels : certains axes exigent contexte marque
 *  + embeddings (Ollama/OpenAI) et restent absents tant que non calculés. */
export interface TarsisSignal {
  sectorArticles?: ReadonlyArray<OvertonSectorArticle>;
  vocabularyOverlap?: number;
  claimImitations?: ReadonlyArray<{ competitorId: string; phrase: string; observedAt: string; sourceUrl?: string }>;
  unpaidPress?: ReadonlyArray<{ publication: string; headline: string; publishedAt: string; sourceUrl?: string }>;
  embeddingDelta?: number;
  windowFrom?: string;
  windowTo?: string;
  /** `false` désormais : la donnée est réelle (dérivée RSS). Conservé pour audit. */
  _mocked?: boolean;
}

interface DigestData {
  items?: Array<{ title?: string; link?: string; sourceUrl?: string; source?: string; publishedAt?: string }>;
  weakSignals?: Array<{ event?: string; causalChain?: string[] }>;
  generatedAt?: string;
  feedSource?: string;
}
function sourceUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !URL.canParse(value)) return;
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
}
function date(value: unknown): string | undefined {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : undefined;
}

/** Read existing collected evidence, never fetch or manufacture observations. */
export async function fetchSectorSignal(
  _operatorId: string,
  sectorSlug: string,
  scope?: { strategyId: string; countryCode?: string | null },
): Promise<ConnectorResult<TarsisSignal>> {
  try {
    const select = { data: true, createdAt: true } as const;
    const owned = scope ? await db.knowledgeEntry.findFirst({
      where: { entryType: "EXTERNAL_FEED_DIGEST", market: `brand:${scope.strategyId}` },
      orderBy: { createdAt: "desc" }, select,
    }) : null;
    const digest = owned ?? await db.knowledgeEntry.findFirst({
      where: {
        entryType: "EXTERNAL_FEED_DIGEST",
        sector: { equals: sectorSlug, mode: "insensitive" },
        OR: [{ market: null }, { market: { not: { startsWith: "brand:" } } }],
        ...(scope?.countryCode ? { countryCode: scope.countryCode } : {}),
      },
      orderBy: { createdAt: "desc" }, select,
    });
    if (!digest) return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
    const data = (digest.data ?? {}) as DigestData;
    const items = Array.isArray(data.items) ? data.items : [];
    const sectorArticles: OvertonSectorArticle[] = items.flatMap((item) => {
      const url = sourceUrl(item.sourceUrl) ?? sourceUrl(item.link);
      return url && typeof item.title === "string" && item.title.trim()
        ? [{ headline: item.title, sourceUrl: url, publication: item.source || new URL(url).hostname, publishedAt: date(item.publishedAt) }] : [];
    });
    // Legacy sourced digests remain readable, but are not evidence of an unpaid
    // brand mention. A causal-chain sentence is not a publisher URL.
    for (const weak of Array.isArray(data.weakSignals) ? data.weakSignals : []) {
      const url = weak.causalChain?.map(sourceUrl).find(Boolean);
      if (url && weak.event) sectorArticles.push({ headline: weak.event, publication: new URL(url).hostname, sourceUrl: url });
    }
    if (!sectorArticles.length) return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
    const observedAt = date(data.generatedAt) ?? digest.createdAt.toISOString();
    return { state: "LIVE", observedAt, data: {
      sectorArticles, unpaidPress: [], claimImitations: [],
      windowTo: observedAt, _mocked: false,
    } };
  } catch {
    return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
  }
}

/**
 * Test-call : Tarsis est opérationnel dès qu'au moins un digest RSS existe.
 * Plus de dépendance à une credential vendor.
 */
export async function testTarsisConnection(
  _operatorId: string,
): Promise<{ success: boolean; reason?: string }> {
  const digest = await db.knowledgeEntry.findFirst({
    where: { entryType: "EXTERNAL_FEED_DIGEST" },
    select: { id: true },
  });
  if (digest) return { success: true };
  return {
    success: false,
    reason: "Aucun digest RSS disponible — lancer FETCH_EXTERNAL_FEED (external-feeds).",
  };
}
