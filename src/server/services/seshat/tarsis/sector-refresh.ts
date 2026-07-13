/**
 * sector-refresh — registre `Sector` + rafraîchissement sectoriel depuis les
 * digests RSS réels (ADR-0134 §B6). Sous-domaine Seshat/Tarsis.
 *
 * L'audit 2026-07-13 (T10) a établi que le pont RSS→axe Overton était codé et
 * testé mais JAMAIS appelé : `bridgeTarsisToSectorIntelligence`
 * (campaign-tracker) n'avait aucun caller, et la table `Sector` n'avait AUCUN
 * writer — `refreshSectorOvertonFromConnector` répondait `SECTOR_NOT_FOUND` à
 * vie. Ce module est LE caller manquant, ancré au cron `external-feeds`
 * (après l'ingestion des digests).
 *
 * Doctrine :
 *   - `ensureSectorRegistryRows` provisionne des rows de REGISTRE uniquement
 *     (slug/nom/pays) — `culturalAxis`/`overtonState`/`lastObservedAt` restent
 *     null tant que rien n'est MESURÉ : aucune donnée culturelle inventée.
 *   - Idempotence : un secteur dont `lastObservedAt` couvre déjà le dernier
 *     digest est SKIPPED `ALREADY_FRESH` (pas de recalcul quotidien à vide).
 *   - Stratégie porteuse de campagne → LE pont Phase 23 (`via: "BRIDGE"`) ;
 *     secteur sans campagne → connector + ingestion directe
 *     (`via: "SECTOR_ONLY"`, alimente le fallback global du radar).
 *   - Tous les états SKIPPED sont remontés tels quels (P22-1) — jamais avalés.
 *   - Zéro LLM ; l'operatorId du connecteur est un sentinel (ignoré — le
 *     socle Tarsis ne dépend d'aucune credential depuis le dé-mock).
 */

import { db } from "@/lib/db";
import { normalizeSectorKey } from "@/server/services/seshat/external-feeds";

export const SECTOR_REFRESH_OPERATOR_SENTINEL = "SYSTEM:cron:external-feeds" as const;
/** Fenêtre de fraîcheur des digests considérés. */
export const DIGEST_LOOKBACK_HOURS = 48;

export interface SectorRefreshOutcome {
  sectorSlug: string;
  state: "REFRESHED" | "SKIPPED";
  via: "BRIDGE" | "SECTOR_ONLY";
  reason?:
    | "ALREADY_FRESH"
    | "AWAITING_CREDENTIALS"
    | "DEGRADED_INPUT"
    | "SECTOR_NOT_FOUND"
    | "BRIDGE_ERROR";
}

/** Libellé humain d'un slug de registre ("fmcg / agro" → "Fmcg / Agro"). */
function humanizeSlug(slug: string): string {
  return slug.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/** Miroir de `campaign-tracker/signals-culture.extractSectorSlugFromStrategy`. */
function extractSectorSlug(businessContext: unknown): string | null {
  if (businessContext && typeof businessContext === "object" && !Array.isArray(businessContext)) {
    const ctx = businessContext as Record<string, unknown>;
    if (typeof ctx.sector === "string" && ctx.sector.length > 0) return ctx.sector;
  }
  return null;
}

export interface SectorRegistryEntry {
  slug: string;
  countryCodes: readonly string[];
}

/**
 * Provisionne les rows `Sector` de REGISTRE (la table n'avait aucun writer).
 * Upsert par slug unique ; `countryCodes` est fusionné ; les champs de MESURE
 * (`culturalAxis`/`overtonState`/`lastObservedAt`) ne sont JAMAIS touchés ici.
 * Retourne le nombre de rows créées.
 */
export async function ensureSectorRegistryRows(
  entries: readonly SectorRegistryEntry[],
): Promise<number> {
  let created = 0;
  for (const entry of entries) {
    const existing = await db.sector.findUnique({
      where: { slug: entry.slug },
      select: { id: true, countryCodes: true },
    });
    if (!existing) {
      await db.sector.create({
        data: {
          slug: entry.slug,
          name: humanizeSlug(entry.slug),
          countryCodes: [...new Set(entry.countryCodes)],
        },
      });
      created += 1;
      continue;
    }
    const merged = [...new Set([...existing.countryCodes, ...entry.countryCodes])];
    if (merged.length !== existing.countryCodes.length) {
      await db.sector.update({ where: { slug: entry.slug }, data: { countryCodes: merged } });
    }
  }
  return created;
}

/**
 * Rafraîchit l'axe Overton des secteurs couverts par un digest RSS récent.
 * Appelé par le cron `external-feeds` APRÈS `refreshAllPriorityPairs()`.
 */
export async function refreshSectorsFromRecentDigests(): Promise<SectorRefreshOutcome[]> {
  const floor = new Date(Date.now() - DIGEST_LOOKBACK_HOURS * 3_600_000);
  const [digests, strategies] = await Promise.all([
    db.knowledgeEntry.findMany({
      where: { entryType: "EXTERNAL_FEED_DIGEST", createdAt: { gte: floor }, sector: { not: null } },
      select: { sector: true, countryCode: true, createdAt: true },
    }),
    db.strategy.findMany({
      // Pas de filtre Json sur businessContext (sémantique DbNull piégeuse) —
      // extractSectorSlug fait le tri, une stratégie sans secteur est ignorée.
      where: { status: { not: "ARCHIVED" } },
      select: {
        id: true,
        businessContext: true,
        countryCode: true,
        campaigns: {
          where: { status: { not: "ARCHIVED" } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true },
        },
      },
    }),
  ]);
  if (digests.length === 0) return [];

  // Digest sectors normalisés → dernier digest + pays observés.
  const digestBySector = new Map<string, { latestAt: Date; countryCodes: Set<string> }>();
  for (const d of digests) {
    const key = normalizeSectorKey(d.sector ?? "");
    if (!key) continue;
    const agg = digestBySector.get(key) ?? { latestAt: d.createdAt, countryCodes: new Set<string>() };
    if (d.createdAt > agg.latestAt) agg.latestAt = d.createdAt;
    if (d.countryCode) agg.countryCodes.add(d.countryCode);
    digestBySector.set(key, agg);
  }

  // Unités de travail par slug : d'abord les slugs des STRATÉGIES couvertes
  // par un digest (le connecteur matche digest.sector CONTAINS slug), puis
  // les secteurs de digest orphelins (SECTOR_ONLY — fallback global du radar).
  interface Unit {
    slug: string;
    latestDigestAt: Date;
    countryCodes: Set<string>;
    bridge: { strategyId: string; campaignId: string } | null;
  }
  const units = new Map<string, Unit>();

  for (const s of strategies) {
    const rawSlug = extractSectorSlug(s.businessContext);
    const slug = rawSlug ? normalizeSectorKey(rawSlug) : null;
    if (!slug) continue;
    // Même sémantique de match que le connecteur (contains, insensitive).
    let latestAt: Date | null = null;
    const countryCodes = new Set<string>();
    for (const [digestSector, agg] of digestBySector) {
      if (!digestSector.includes(slug)) continue;
      if (!latestAt || agg.latestAt > latestAt) latestAt = agg.latestAt;
      for (const c of agg.countryCodes) countryCodes.add(c);
    }
    if (!latestAt) continue; // aucun digest ne couvre ce secteur
    if (s.countryCode) countryCodes.add(s.countryCode);

    const existing = units.get(slug);
    const campaignId = s.campaigns[0]?.id ?? null;
    if (!existing) {
      units.set(slug, {
        slug,
        latestDigestAt: latestAt,
        countryCodes,
        bridge: campaignId ? { strategyId: s.id, campaignId } : null,
      });
    } else {
      for (const c of countryCodes) existing.countryCodes.add(c);
      // Une stratégie AVEC campagne prime (le pont Phase 23 est le chemin canon).
      if (!existing.bridge && campaignId) existing.bridge = { strategyId: s.id, campaignId };
    }
  }

  // Secteurs de digest sans stratégie correspondante → SECTOR_ONLY.
  for (const [digestSector, agg] of digestBySector) {
    const covered = [...units.keys()].some((slug) => digestSector.includes(slug));
    if (covered) continue;
    units.set(digestSector, {
      slug: digestSector,
      latestDigestAt: agg.latestAt,
      countryCodes: new Set(agg.countryCodes),
      bridge: null,
    });
  }
  if (units.size === 0) return [];

  await ensureSectorRegistryRows(
    [...units.values()].map((u) => ({ slug: u.slug, countryCodes: [...u.countryCodes] })),
  );

  const outcomes: SectorRefreshOutcome[] = [];
  for (const unit of units.values()) {
    const via: SectorRefreshOutcome["via"] = unit.bridge ? "BRIDGE" : "SECTOR_ONLY";
    try {
      // Idempotence — le dernier digest est déjà intégré à la mesure.
      const sector = await db.sector.findUnique({
        where: { slug: unit.slug },
        select: { lastObservedAt: true },
      });
      if (sector?.lastObservedAt && sector.lastObservedAt >= unit.latestDigestAt) {
        outcomes.push({ sectorSlug: unit.slug, state: "SKIPPED", via, reason: "ALREADY_FRESH" });
        continue;
      }

      if (unit.bridge) {
        // LE caller du pont Phase 23 (couture campaign-tracker → tarsis,
        // import dynamique — pas d'arête statique inverse).
        const { bridgeTarsisToSectorIntelligence } = await import(
          "@/server/services/campaign-tracker/signals-culture"
        );
        const result = await bridgeTarsisToSectorIntelligence({
          strategyId: unit.bridge.strategyId,
          campaignId: unit.bridge.campaignId,
          operatorId: SECTOR_REFRESH_OPERATOR_SENTINEL,
        });
        outcomes.push(
          result.connectorState === "LIVE"
            ? { sectorSlug: unit.slug, state: "REFRESHED", via }
            : {
                sectorSlug: unit.slug,
                state: "SKIPPED",
                via,
                reason:
                  result.connectorState === "DEFERRED_AWAITING_CREDENTIALS"
                    ? "AWAITING_CREDENTIALS"
                    : "DEGRADED_INPUT",
              },
        );
        continue;
      }

      // SECTOR_ONLY — connector + ingestion directe (chemin canonique Phase 23).
      const { fetchSectorSignal } = await import("@/server/services/seshat/tarsis/connector");
      const { refreshSectorOvertonFromConnector } = await import(
        "@/server/services/sector-intelligence"
      );
      const signals = await fetchSectorSignal(SECTOR_REFRESH_OPERATOR_SENTINEL, unit.slug);
      const refresh = await refreshSectorOvertonFromConnector({ slug: unit.slug, signals });
      outcomes.push(
        refresh.state === "REFRESHED"
          ? { sectorSlug: unit.slug, state: "REFRESHED", via }
          : { sectorSlug: unit.slug, state: "SKIPPED", via, reason: refresh.reason },
      );
    } catch {
      outcomes.push({ sectorSlug: unit.slug, state: "SKIPPED", via, reason: "BRIDGE_ERROR" });
    }
  }
  return outcomes;
}
