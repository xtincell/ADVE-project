/**
 * src/server/services/market-visibility/index.ts — ADR-0105 market kill-switch.
 *
 * Résolveur de visibilité marché. À partir des marchés invisibles (Country.status
 * ∈ SHADOWBANNED | PURGED), calcule en cascade les **ensembles d'identifiants**
 * descendants à exclure de toute lecture non-ADMIN. Le marché d'une racine est
 * porté par son `countryCode` ISO-2 (`Strategy.countryCode`, `BrandNode.countryCode`)
 * — jamais par un champ `country` libre (qui contient des noms d'affichage, ex.
 * `Client.country = "Wakanda"`). Les clients sont rattachés via leurs stratégies.
 *
 * Résultat caché (TTL court) — le statut marché change rarement ; les Intents du
 * kill-switch invalident explicitement le cache.
 */

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

export interface MarketVisibility {
  /** Codes ISO-2 des marchés invisibles (SHADOWBANNED + PURGED). */
  invisibleCodes: string[];
  strategyIds: string[];
  clientIds: string[];
  campaignIds: string[];
  missionIds: string[];
  brandNodeIds: string[];
  /** true ⇒ aucun marché neutralisé → aucun filtrage nécessaire (fast path). */
  empty: boolean;
}

const EMPTY: MarketVisibility = {
  invisibleCodes: [],
  strategyIds: [],
  clientIds: [],
  campaignIds: [],
  missionIds: [],
  brandNodeIds: [],
  empty: true,
};

const TTL_MS = 15_000;
let cache: { value: MarketVisibility; at: number } | null = null;

/** Invalide le cache — appelé par les handlers NEUTRALIZE/REINSTATE/PURGE_MARKET. */
export function invalidateMarketVisibility(): void {
  cache = null;
}

function nonNull(values: (string | null)[]): string[] {
  return values.filter((v): v is string => v !== null && v !== undefined);
}

export async function resolveMarketVisibility(rawDb: PrismaClient): Promise<MarketVisibility> {
  const nowMs = Date.now();
  if (cache && nowMs - cache.at < TTL_MS) return cache.value;

  const invisible = await rawDb.country.findMany({
    where: { status: { in: ["SHADOWBANNED", "PURGED"] } },
    select: { code: true },
  });
  const invisibleCodes = invisible.map((c) => c.code);
  if (invisibleCodes.length === 0) {
    cache = { value: EMPTY, at: nowMs };
    return EMPTY;
  }

  // Racines : stratégies dont le marché propre (countryCode ISO-2) est invisible.
  const invisibleStrategies = await rawDb.strategy.findMany({
    where: { countryCode: { in: invisibleCodes } },
    select: { id: true, clientId: true },
  });
  const strategyIds = invisibleStrategies.map((s) => s.id);
  const candidateClientIds = [...new Set(nonNull(invisibleStrategies.map((s) => s.clientId)))];

  // Un client n'est masqué que si AUCUNE de ses stratégies n'est dans un marché
  // visible/inconnu (sécurité multi-marché — ne pas masquer un client encore actif
  // ailleurs). `Client.country` (nom d'affichage) n'est jamais consulté.
  let clientIds: string[] = [];
  if (candidateClientIds.length > 0) {
    const stillVisible = await rawDb.strategy.findMany({
      where: {
        clientId: { in: candidateClientIds },
        OR: [{ countryCode: { notIn: invisibleCodes } }, { countryCode: null }],
      },
      select: { clientId: true },
    });
    const visibleSet = new Set(nonNull(stillVisible.map((s) => s.clientId)));
    clientIds = candidateClientIds.filter((id) => !visibleSet.has(id));
  }

  // BrandNodes : code ISO-2 propre invisible, ou descendant d'une racine invisible.
  const brandNodeOr: Prisma.BrandNodeWhereInput[] = [{ countryCode: { in: invisibleCodes } }];
  if (strategyIds.length > 0) brandNodeOr.push({ strategyId: { in: strategyIds } });
  if (clientIds.length > 0) brandNodeOr.push({ clientId: { in: clientIds } });
  const brandNodes = await rawDb.brandNode.findMany({ where: { OR: brandNodeOr }, select: { id: true } });
  const brandNodeIds = brandNodes.map((b) => b.id);

  // Campagnes des stratégies invisibles.
  const campaignIds =
    strategyIds.length > 0
      ? (await rawDb.campaign.findMany({ where: { strategyId: { in: strategyIds } }, select: { id: true } })).map(
          (c) => c.id,
        )
      : [];

  // Missions des stratégies / campagnes invisibles.
  const missionOr: Prisma.MissionWhereInput[] = [];
  if (strategyIds.length > 0) missionOr.push({ strategyId: { in: strategyIds } });
  if (campaignIds.length > 0) missionOr.push({ campaignId: { in: campaignIds } });
  const missionIds =
    missionOr.length > 0
      ? (await rawDb.mission.findMany({ where: { OR: missionOr }, select: { id: true } })).map((m) => m.id)
      : [];

  const value: MarketVisibility = {
    invisibleCodes,
    strategyIds,
    clientIds,
    campaignIds,
    missionIds,
    brandNodeIds,
    empty: false,
  };
  cache = { value, at: nowMs };
  return value;
}
