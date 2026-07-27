/**
 * src/server/mcp/_shared/strategy-activity.ts — SOURCE UNIQUE de l'activité
 * d'une marque exposée par MCP : ses missions et son calendrier.
 *
 * ## Pourquoi ce module existe
 *
 * L'audit MCP (2026-07-27) a relevé deux outils qui répondaient **deux vérités
 * contradictoires sur la même donnée** : pour SPAWT, `content_calendar_get`
 * rendait 2 missions et `mission_list` en rendait 0. Cause : chacun écrivait sa
 * propre requête, avec ses propres filtres, dont l'un ignorait silencieusement le
 * paramètre de marque. Tant que deux chemins existent, aucun agent ne peut
 * raisonner sur l'état opérationnel.
 *
 * Les deux outils consomment désormais les fonctions ci-dessous.
 *
 * Le préfixe `_` du dossier le tient hors de `MCP_SERVER_NAMES` : ce n'est pas
 * un serveur, c'est la couche de lecture partagée.
 *
 * Déterministe, lecture seule, zéro LLM, aucune donnée fabriquée (P22-2).
 */

import { db } from "@/lib/db";

export interface StrategyMissionFilters {
  strategyId: string;
  campaignId?: string;
  driverId?: string;
  status?: string;
  limit?: number;
}

/**
 * Missions d'une marque. `strategyId` est **toujours** appliqué — c'est ce qui
 * manquait au chemin calendrier, qui renvoyait alors les missions de toutes les
 * marques de la base.
 */
export async function listStrategyMissions(filters: StrategyMissionFilters) {
  return db.mission.findMany({
    where: {
      strategyId: filters.strategyId,
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
      ...(filters.driverId ? { driverId: filters.driverId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: { driver: true },
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 20,
  });
}

/** Une entrée de calendrier, quelle que soit sa provenance. */
export interface CalendarEntry {
  /** `ACTION` (plan d'actions) · `MISSION` (production) · `PUBLICATION` (post publié). */
  kind: "ACTION" | "MISSION" | "PUBLICATION";
  id: string;
  title: string;
  /** Date qui positionne l'entrée dans le calendrier (ISO). */
  date: string;
  /** Fin de fenêtre, quand l'entrée en a une. */
  endDate: string | null;
  status: string | null;
  /** Canal / plateforme / point de contact, selon la nature de l'entrée. */
  channel: string | null;
  /** Table d'origine — pour qu'un agent sache d'où vient chaque ligne. */
  source: "BrandAction" | "Mission" | "SocialPost";
  campaignId?: string | null;
}

export interface CalendarWindow {
  strategyId: string;
  from?: Date;
  to?: Date;
  kinds?: Array<CalendarEntry["kind"]>;
}

function weekKey(d: Date): string {
  const start = new Date(d);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  return start.toISOString().slice(0, 10);
}

/**
 * Le calendrier digital réel d'une marque, composé des trois sources que le
 * cockpit affiche déjà :
 *
 *  - **`BrandAction`** — le plan d'actions daté (`timingStart`/`timingEnd`),
 *    c'est-à-dire ce que la marque a prévu de faire ;
 *  - **`Mission`** — la production commandée (échéance SLA) ;
 *  - **`SocialPost`** — ce qui est effectivement parti (`publishedAt`).
 *
 * Le planifié et le publié ne sont **jamais mélangés** : chaque entrée porte son
 * `kind` et sa table d'origine. L'ancien outil ne lisait que les missions — donc
 * le calendrier « éditorial » d'un fondateur était en réalité le carnet de
 * commandes de l'agence, et le plan d'actions du cockpit n'y apparaissait pas.
 */
export async function buildStrategyCalendar(win: CalendarWindow): Promise<{
  entries: CalendarEntry[];
  byWeek: Record<string, CalendarEntry[]>;
  counts: Record<CalendarEntry["kind"], number>;
}> {
  const wants = (k: CalendarEntry["kind"]) => !win.kinds || win.kinds.includes(k);
  const dateFilter =
    win.from || win.to
      ? { ...(win.from ? { gte: win.from } : {}), ...(win.to ? { lte: win.to } : {}) }
      : undefined;

  const [actions, missions, posts] = await Promise.all([
    wants("ACTION")
      ? db.brandAction.findMany({
          where: {
            strategyId: win.strategyId,
            timingStart: dateFilter ? { not: null, ...dateFilter } : { not: null },
          },
          select: {
            id: true, title: true, timingStart: true, timingEnd: true,
            status: true, touchpoint: true, campaignId: true,
          },
          orderBy: { timingStart: "asc" },
        })
      : Promise.resolve([]),
    wants("MISSION")
      ? db.mission.findMany({
          where: {
            strategyId: win.strategyId,
            slaDeadline: dateFilter ? { not: null, ...dateFilter } : { not: null },
          },
          select: {
            id: true, title: true, slaDeadline: true, status: true, campaignId: true,
            driver: { select: { channel: true } },
          },
          orderBy: { slaDeadline: "asc" },
        })
      : Promise.resolve([]),
    wants("PUBLICATION")
      ? db.socialPost.findMany({
          where: {
            strategyId: win.strategyId,
            publishedAt: dateFilter ? { not: null, ...dateFilter } : { not: null },
          },
          select: {
            id: true, content: true, publishedAt: true, permalinkUrl: true,
            connection: { select: { platform: true } },
          },
          orderBy: { publishedAt: "desc" },
          take: 200,
        })
      : Promise.resolve([]),
  ]);

  const entries: CalendarEntry[] = [
    ...actions.map((a) => ({
      kind: "ACTION" as const,
      id: a.id,
      title: a.title,
      date: a.timingStart!.toISOString(),
      endDate: a.timingEnd?.toISOString() ?? null,
      status: a.status,
      channel: a.touchpoint,
      source: "BrandAction" as const,
      campaignId: a.campaignId,
    })),
    ...missions.map((m) => ({
      kind: "MISSION" as const,
      id: m.id,
      title: m.title,
      date: m.slaDeadline!.toISOString(),
      endDate: null,
      status: m.status,
      channel: m.driver?.channel ?? null,
      source: "Mission" as const,
      campaignId: m.campaignId,
    })),
    ...posts.map((p) => ({
      kind: "PUBLICATION" as const,
      id: p.id,
      // Le contenu d'un post n'a pas de titre : on prend une amorce lisible
      // plutôt que d'inventer un libellé.
      title: (p.content ?? "").slice(0, 120) || "(publication sans texte)",
      date: p.publishedAt!.toISOString(),
      endDate: null,
      status: "PUBLISHED",
      channel: p.connection?.platform ?? null,
      source: "SocialPost" as const,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const byWeek: Record<string, CalendarEntry[]> = {};
  for (const e of entries) {
    const k = weekKey(new Date(e.date));
    (byWeek[k] ??= []).push(e);
  }

  return {
    entries,
    byWeek,
    counts: {
      ACTION: entries.filter((e) => e.kind === "ACTION").length,
      MISSION: entries.filter((e) => e.kind === "MISSION").length,
      PUBLICATION: entries.filter((e) => e.kind === "PUBLICATION").length,
    },
  };
}
