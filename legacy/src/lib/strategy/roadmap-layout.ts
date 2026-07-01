/**
 * roadmap-layout.ts — Layout PUR de la Macro Roadmap (ADR-0120 PR-4c). Client-safe (Layer: lib).
 *
 * Positionne les campagnes d'une stratégie sur une timeline horizontale, proportionnellement
 * à leurs dates (start/end). Une campagne always-on (ou sans fin) s'étend jusqu'au bout de la
 * fenêtre. Les campagnes sans date utilisable sont listées à part (`undated`), non positionnées.
 * Zéro dépendance runtime, déterministe (le `now` est injecté).
 */

export interface RoadmapCampaignInput {
  id: string;
  name: string;
  canonType?: string | null;
  routeKey?: string | null;
  status?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  isAlwaysOn?: boolean | null;
}

export interface RoadmapBar {
  id: string;
  name: string;
  canonType: string | null;
  routeKey: string | null;
  status: string | null;
  isAlwaysOn: boolean;
  leftPct: number; // 0..100
  widthPct: number; // 0..100
  startDate: string; // ISO yyyy-mm-dd
  endDate: string | null; // ISO ; null si always-on / ouvert
}

export interface RoadmapLayout {
  windowStart: string | null; // ISO
  windowEnd: string | null; // ISO
  bars: RoadmapBar[];
  undated: Array<{ id: string; name: string; canonType: string | null; status: string | null }>;
  nowPct: number | null; // position de « aujourd'hui » dans la fenêtre (null si hors fenêtre)
}

const MS_DAY = 86_400_000;
const MIN_WIDTH_PCT = 2;
const OPEN_ENDED_PADDING_DAYS = 90;

function ts(v: string | Date | null | undefined): number | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}
function iso(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export function computeRoadmapLayout(campaigns: RoadmapCampaignInput[], now: Date): RoadmapLayout {
  const parsed = campaigns.map((c) => ({ c, start: ts(c.startDate), end: ts(c.endDate) }));
  const dated = parsed.filter((p) => p.start != null);
  const undated = parsed
    .filter((p) => p.start == null)
    .map((p) => ({ id: p.c.id, name: p.c.name, canonType: p.c.canonType ?? null, status: p.c.status ?? null }));

  if (dated.length === 0) {
    return { windowStart: null, windowEnd: null, bars: [], undated, nowPct: null };
  }

  const starts = dated.map((p) => p.start!);
  const ends = dated.map((p) => p.end ?? p.start!);
  const windowStart = Math.min(...starts);
  let windowEnd = Math.max(...ends, ...starts);
  // Tout ouvert / always-on → étend la fenêtre pour rester lisible.
  if (windowEnd <= windowStart) windowEnd = windowStart + OPEN_ENDED_PADDING_DAYS * MS_DAY;
  const span = windowEnd - windowStart || 1;

  const bars: RoadmapBar[] = [...dated]
    .sort((a, b) => a.start! - b.start! || a.c.id.localeCompare(b.c.id))
    .map((p) => {
      const start = p.start!;
      const openEnded = !!p.c.isAlwaysOn || p.end == null;
      const end = openEnded ? windowEnd : Math.max(p.end!, start);
      const leftPct = Math.max(0, Math.min(100, ((start - windowStart) / span) * 100));
      const rawWidth = ((end - start) / span) * 100;
      return {
        id: p.c.id,
        name: p.c.name,
        canonType: p.c.canonType ?? null,
        routeKey: p.c.routeKey ?? null,
        status: p.c.status ?? null,
        isAlwaysOn: !!p.c.isAlwaysOn,
        leftPct,
        widthPct: Math.max(MIN_WIDTH_PCT, Math.min(100 - leftPct, rawWidth)),
        startDate: iso(start),
        endDate: openEnded ? null : iso(end),
      };
    });

  const nowT = now.getTime();
  const nowPct = nowT >= windowStart && nowT <= windowEnd ? ((nowT - windowStart) / span) * 100 : null;

  return { windowStart: iso(windowStart), windowEnd: iso(windowEnd), bars, undated, nowPct };
}
