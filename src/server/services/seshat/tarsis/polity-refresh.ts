/**
 * polity-refresh — harvester digest→polity (ADR-0127, sous-domaine Seshat/Tarsis).
 *
 * MIROIR de `sector-refresh.refreshSectorsFromRecentDigests()` (l'axe Overton
 * sectoriel GLOBAL) qui AJOUTE la dimension `marketScale` : il remplit les rows
 * `SectorPolityAxis` (secteur × échelle de marché × pays) à partir des mêmes
 * digests RSS réels, pour que le radar Overton du founder ait une granularité
 * par polity (déplacer la fenêtre d'un quartier ≠ la déplacer d'un continent).
 *
 * Doctrine (ADR-0126/0127 — anti-fabrication) :
 *   - L'échelle de marché est DÉCLARÉE (opérateur/founder), JAMAIS devinée. Une
 *     stratégie sans `marketScale` NE contribue à AUCUNE polity : elle alimente
 *     seulement l'axe Sector GLOBAL (déjà géré par le sector harvester, qui reste
 *     le `GLOBAL_FALLBACK` de résolution). On NE DÉFAUTE JAMAIS une échelle — le
 *     garde `resolvePolityUnits` SKIP purement et simplement (voir la fonction).
 *   - L'axe polity n'est écrit QUE si le secteur a un signal RSS LIVE réel :
 *     pas de signal → pas de row (on dégrade, on n'invente pas, ADR-0046).
 *   - Écriture GOUVERNÉE via `emitIntent(SESHAT_UPSERT_POLITY_AXIS)` — JAMAIS un
 *     `db.sectorPolityAxis.upsert` nu. Le MÊME signal digest-dérivé que l'axe
 *     global (`fetchSectorSignal` → `tarsisSignalToLegacySignals`) est réutilisé
 *     tel quel (pas de computation subtilement différente).
 *   - Additif & idempotent : `upsertPolityAxis` upsert sur la clé unique
 *     (sectorSlug, marketScale, countryCode) ; un secteur déjà à jour est SKIP
 *     `ALREADY_FRESH`. Les polity rows n'AJOUTENT que de la granularité.
 *   - Zéro LLM ; sentinel operatorId Tarsis (socle dé-mocké, sans credential).
 *
 * NB — ceci n'a RIEN à voir avec le plafond d'évidence CULTE/ICONE : câbler des
 * signaux faibles dans ce plafond est un item SÉPARÉMENT REFUSÉ (T9, ADR-0137).
 * Ce harvester ne touche que l'axe culturel/Overton (granularité radar).
 */

import { db } from "@/lib/db";
import type { ConnectorResult, MarketScale } from "@/domain";
import type { TarsisSignal } from "@/server/services/seshat/tarsis/connector";
import { normalizeSectorKey } from "@/server/services/seshat/external-feeds";
import type { DigestSectorAggregate } from "./sector-refresh";
import {
  SECTOR_REFRESH_OPERATOR_SENTINEL,
  ensureSectorRegistryRows,
  extractSectorSlug,
  loadRecentDigestsBySector,
} from "./sector-refresh";

/**
 * `strategyId` porté par l'émission polity. La row `SectorPolityAxis` est
 * sector-scoped (agrège N stratégies d'une même échelle×pays) — aucune stratégie
 * n'en est propriétaire, d'où un sentinel (partitionne le hash-chain, jamais
 * résolu comme une vraie stratégie par les gates ; `marketStatusGate` PASS).
 */
export const POLITY_STRATEGY_SENTINEL = "(sector)" as const;

export interface PolityRefreshOutcome {
  sectorSlug: string;
  marketScale: MarketScale;
  /** "" = axe supra-national de l'échelle (pays non déclaré). */
  countryCode: string;
  state: "REFRESHED" | "SKIPPED";
  reason?: "ALREADY_FRESH" | "DEGRADED_INPUT" | "SECTOR_NOT_FOUND" | "EMIT_ERROR";
}

/** Stratégie réduite à ce dont la résolution polity a besoin (slug déjà normalisé). */
export interface PolityStrategyInput {
  /** Slug de secteur DÉJÀ normalisé (via `extractSectorSlug` + `normalizeSectorKey`). */
  sectorSlug: string | null;
  /** Échelle DÉCLARÉE (null = non qualifiée → aucune contribution polity). */
  marketScale: MarketScale | null;
  countryCode: string | null;
}

/** Coordonnée polity résolue + fraîcheur du digest qui la couvre. */
export interface PolityUnit {
  sectorSlug: string;
  marketScale: MarketScale;
  /** ISO-2 majuscule, "" = supra-national. */
  countryCode: string;
  latestDigestAt: Date;
}

/**
 * PURE (zéro I/O, déterministe, LOI 9) : résout les coordonnées polity distinctes
 * couvertes par un digest récent. **C'est ici que vit le garde anti-fabrication** :
 * une stratégie sans échelle DÉCLARÉE est ignorée — jamais d'échelle inventée.
 */
export function resolvePolityUnits(input: {
  digestBySector: ReadonlyMap<string, DigestSectorAggregate>;
  strategies: readonly PolityStrategyInput[];
}): PolityUnit[] {
  const units = new Map<string, PolityUnit>();
  for (const s of input.strategies) {
    // ── ANTI-FABRICATION (ADR-0126/0127) ────────────────────────────────
    // Échelle NON déclarée → AUCUNE contribution polity. On NE DÉFAUTE JAMAIS
    // une échelle : la marque alimente seulement l'axe Sector GLOBAL (géré par
    // le sector harvester). Une row SectorPolityAxis n'existe QUE sur une
    // échelle réellement DÉCLARÉE (nullable, ADR-0126).
    if (!s.marketScale) continue;
    if (!s.sectorSlug) continue;

    // Couverture digest — MÊME sémantique de match que le sector harvester
    // (digest.sector CONTAINS slug), sur la carte de couverture PARTAGÉE.
    let latestAt: Date | null = null;
    for (const [digestSector, agg] of input.digestBySector) {
      if (!digestSector.includes(s.sectorSlug)) continue;
      if (!latestAt || agg.latestAt > latestAt) latestAt = agg.latestAt;
    }
    if (!latestAt) continue; // secteur non couvert par un digest récent → pas de polity

    const countryCode = (s.countryCode ?? "").toUpperCase();
    const key = `${s.sectorSlug}|${s.marketScale}|${countryCode}`;
    const existing = units.get(key);
    if (!existing) {
      units.set(key, { sectorSlug: s.sectorSlug, marketScale: s.marketScale, countryCode, latestDigestAt: latestAt });
    } else if (latestAt > existing.latestDigestAt) {
      existing.latestDigestAt = latestAt;
    }
  }
  return [...units.values()];
}

/**
 * Rafraîchit les axes Overton PAR POLITY couverts par un digest RSS récent.
 * Appelé par le cron `external-feeds` JUSTE APRÈS `refreshSectorsFromRecentDigests()`.
 */
export async function refreshPolityAxesFromRecentDigests(): Promise<PolityRefreshOutcome[]> {
  const digestBySector = await loadRecentDigestsBySector();
  if (digestBySector.size === 0) return [];

  const strategies = await db.strategy.findMany({
    // Pas de filtre Json sur businessContext — extractSectorSlug fait le tri.
    where: { status: { not: "ARCHIVED" } },
    select: { businessContext: true, countryCode: true, marketScale: true },
  });

  // Résolution du slug secteur PARTAGÉE avec le sector harvester (extractSectorSlug
  // + normalizeSectorKey) — pas de computation subtilement différente.
  const resolved: PolityStrategyInput[] = strategies.map((s) => {
    const raw = extractSectorSlug(s.businessContext);
    return {
      sectorSlug: raw ? normalizeSectorKey(raw) : null,
      marketScale: s.marketScale ?? null,
      countryCode: s.countryCode,
    };
  });

  const units = resolvePolityUnits({ digestBySector, strategies: resolved });
  if (units.length === 0) return [];

  // Provision DÉFENSIF des rows Sector de REGISTRE — `upsertPolityAxis` jette si
  // le Sector n'existe pas. Idempotent (le sector harvester les a déjà
  // provisionnées en amont ; on ne DÉPEND pas de son exécution). Ne fabrique
  // aucune donnée culturelle (slug/nom/pays seulement).
  const sectorSlugs = [...new Set(units.map((u) => u.sectorSlug))];
  await ensureSectorRegistryRows(
    sectorSlugs.map((slug) => ({
      slug,
      countryCodes: units.filter((u) => u.sectorSlug === slug && u.countryCode).map((u) => u.countryCode),
    })),
  );

  // Imports dynamiques — connecteur (couture Tarsis), writer (sector-intelligence)
  // et bus d'émission (mestor) : mêmes arêtes paresseuses que le sector harvester.
  const { fetchSectorSignal } = await import("@/server/services/seshat/tarsis/connector");
  const { tarsisSignalToLegacySignals } = await import("@/server/services/sector-intelligence");
  const { emitIntent } = await import("@/server/services/mestor/intents");

  // Signal sectoriel RÉEL dérivé du digest RSS — country-agnostic, EXACTEMENT
  // comme l'axe global (SECTOR_ONLY). Fetch une fois par secteur (paresseux :
  // une polity ALREADY_FRESH n'entraîne aucun fetch), réutilisé pour ses polities.
  const signalCache = new Map<string, ConnectorResult<TarsisSignal>>();
  const signalFor = async (slug: string): Promise<ConnectorResult<TarsisSignal>> => {
    const cached = signalCache.get(slug);
    if (cached) return cached;
    const fresh = await fetchSectorSignal(SECTOR_REFRESH_OPERATOR_SENTINEL, slug);
    signalCache.set(slug, fresh);
    return fresh;
  };

  const outcomes: PolityRefreshOutcome[] = [];
  for (const unit of units) {
    const coords = { sectorSlug: unit.sectorSlug, marketScale: unit.marketScale, countryCode: unit.countryCode };
    try {
      // Idempotence D'ABORD (lecture seule) — la polity a déjà intégré le
      // dernier digest → SKIP sans même solliciter le connecteur.
      const existing = await db.sectorPolityAxis.findUnique({
        where: {
          sectorSlug_marketScale_countryCode: {
            sectorSlug: unit.sectorSlug,
            marketScale: unit.marketScale,
            countryCode: unit.countryCode,
          },
        },
        select: { lastObservedAt: true },
      });
      if (existing?.lastObservedAt && existing.lastObservedAt >= unit.latestDigestAt) {
        outcomes.push({ ...coords, state: "SKIPPED", reason: "ALREADY_FRESH" });
        continue;
      }

      // Pas de signal LIVE → PAS d'axe polity : on dégrade, on n'invente pas
      // (ADR-0046, miroir du sector harvester).
      const signal = await signalFor(unit.sectorSlug);
      if (signal.state !== "LIVE") {
        outcomes.push({ ...coords, state: "SKIPPED", reason: "DEGRADED_INPUT" });
        continue;
      }

      // ── ÉCRITURE GOUVERNÉE (JAMAIS un db.sectorPolityAxis.upsert nu) ──────
      // Le MÊME signal digest-dérivé que l'axe global. L'axe est CALCULÉ par
      // `upsertPolityAxis` → `computeAxisFromSignals` (aucune fabrication).
      const result = await emitIntent(
        {
          kind: "SESHAT_UPSERT_POLITY_AXIS",
          strategyId: POLITY_STRATEGY_SENTINEL,
          sectorSlug: unit.sectorSlug,
          marketScale: unit.marketScale,
          countryCode: unit.countryCode || null,
          signals: tarsisSignalToLegacySignals(signal.data),
        },
        { caller: "cron:external-feeds:polity" },
      );
      outcomes.push(
        result.status === "OK"
          ? { ...coords, state: "REFRESHED" }
          : { ...coords, state: "SKIPPED", reason: "EMIT_ERROR" },
      );
    } catch {
      // Un échec isolé (connecteur, DB) n'abat jamais tout le harvester.
      outcomes.push({ ...coords, state: "SKIPPED", reason: "EMIT_ERROR" });
    }
  }
  return outcomes;
}
