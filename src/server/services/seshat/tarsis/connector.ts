/**
 * Tarsis — connecteur de signaux sectoriels (sous-domaine Seshat). ADR-0079,
 * Pattern P22-1 (`ConnectorResult<T>`), **de-mocké 2026-06-14 (ADR-0095 suite)**.
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
 * # Contrat (inchangé)
 *
 * `fetchSectorSignal(operatorId, sectorSlug)` → `ConnectorResult<TarsisSignal>` :
 *   - `LIVE`     — signal réel dérivé des digests RSS du secteur (`_mocked:false`).
 *   - `DEGRADED + INSUFFICIENT_DATA` — aucun digest exploitable (PAS de zéro
 *     silencieux : on dégrade, on n'invente pas — P22-1 + ADR-0046).
 *   - `DEGRADED + VENDOR_OUTAGE` — erreur transitoire (DB, etc.).
 * Plus de branche `DEFERRED_AWAITING_CREDENTIALS` : le socle ne dépend plus d'une
 * clé. Les consommateurs (`sector-intelligence/`) gèrent déjà LIVE/DEGRADED.
 *
 * Cap APOGEE 7/7 préservé — connecteur, pas un Neter.
 */

import { db } from "@/lib/db";
import type { ConnectorResult } from "@/domain";

/** Slug Vault (credential OPTIONNELLE — enrichissement premium futur). */
export const TARSIS_CONNECTOR_TYPE = "tarsis-monitoring" as const;
export const TARSIS_DISPLAY_NAME = "Tarsis (monitoring signaux faibles — La Fusée)";

/** Payload sectoriel. Champs optionnels : certains axes exigent contexte marque
 *  + embeddings (Ollama/OpenAI) et restent absents tant que non calculés. */
export interface TarsisSignal {
  vocabularyOverlap?: number;
  claimImitations?: ReadonlyArray<{ competitorId: string; phrase: string; observedAt: string; sourceUrl?: string }>;
  unpaidPress?: ReadonlyArray<{ publication: string; headline: string; publishedAt: string; sourceUrl?: string }>;
  embeddingDelta?: number;
  windowFrom?: string;
  windowTo?: string;
  /** `false` désormais : la donnée est réelle (dérivée RSS). Conservé pour audit. */
  _mocked?: boolean;
}

const WINDOW_DAYS = 7;

interface DigestData {
  weakSignals?: Array<{ event?: string; causalChain?: string[] }>;
  macroSignals?: Array<{ trend?: string }>;
  generatedAt?: string;
  feedSource?: string;
}

/**
 * Signal sectoriel RÉEL dérivé du dernier digest RSS (`EXTERNAL_FEED_DIGEST`)
 * du secteur. `unpaidPress` = mentions presse réelles ; les axes marque/embedding
 * restent absents (honnête) tant qu'ils ne sont pas calculés.
 */
export async function fetchSectorSignal(
  _operatorId: string,
  sectorSlug: string,
): Promise<ConnectorResult<TarsisSignal>> {
  try {
    const digest = await db.knowledgeEntry.findFirst({
      where: {
        entryType: "EXTERNAL_FEED_DIGEST",
        sector: { contains: sectorSlug, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      select: { data: true, createdAt: true },
    });
    if (!digest) {
      return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
    }

    const data = (digest.data ?? {}) as DigestData;
    const weak = Array.isArray(data.weakSignals) ? data.weakSignals : [];
    const publishedAt = data.generatedAt ?? digest.createdAt.toISOString();
    const unpaidPress = weak
      .filter((w): w is { event: string; causalChain?: string[] } => typeof w.event === "string" && w.event.length > 0)
      .map((w) => ({
        publication: data.feedSource ?? "presse",
        headline: w.event,
        publishedAt,
        sourceUrl: Array.isArray(w.causalChain) ? w.causalChain[0] : undefined,
      }));

    if (unpaidPress.length === 0) {
      return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
    }

    const observedAt = new Date().toISOString();
    return {
      state: "LIVE",
      data: {
        unpaidPress,
        // Axes spécifiques marque / embedding : absents tant que non calculés
        // (pas de zéro silencieux). Nécessitent contexte marque + embeddings.
        vocabularyOverlap: undefined,
        claimImitations: [],
        embeddingDelta: undefined,
        windowFrom: new Date(Date.now() - WINDOW_DAYS * 24 * 3600 * 1000).toISOString(),
        windowTo: observedAt,
        _mocked: false,
      },
      observedAt,
    };
  } catch {
    // P22-1 : échec transitoire → DEGRADED, jamais avalé en LIVE.
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
