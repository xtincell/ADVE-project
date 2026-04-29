/**
 * sector-intelligence — Sector as first-class entity (APOGEE drift 5.2 fix).
 *
 * Layer 3 — Telemetry sub-system (Mission Tier).
 * Governor: SESHAT (observation) — uses Tarsis signals as input.
 *
 * Mission contribution: DIRECT_OVERTON. Overton lives in sectors.
 * Without this service the OS treats "sector" as a string field and
 * cannot reason about sector-level cultural axes — making the Overton
 * shift detection structurally impossible. This module is the
 * substrate that lets Mestor + Cockpit show a founder where their
 * sector's center is and whether the brand is bending it.
 *
 * Backed by Prisma model `Sector` (added in Phase 3 schema).
 *
 * The actual axis computation:
 *   - culturalAxis is a JSON of orientation tags ({premium: 0.7, traditional: 0.3, ...})
 *   - dominantNarratives is a list of currently-loud sector themes
 *   - overtonState is a snapshot updated weekly by `refreshSectorOverton`
 *   - drift = vector distance between two consecutive snapshots
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────

export interface SectorAxis {
  /** Orientation vector: tag → strength in [0, 1]. */
  readonly tags: Record<string, number>;
  /** Confidence in this snapshot, 0-1. */
  readonly confidence: number;
  /** Number of Tarsis signals used to compute this snapshot. */
  readonly samples: number;
}

export interface OvertonSnapshot {
  readonly takenAt: string; // ISO
  readonly axis: SectorAxis;
  readonly narratives: { readonly narrative: string; readonly weight: number }[];
}

export interface SectorDrift {
  readonly fromSnapshotAt: string;
  readonly toSnapshotAt: string;
  /** Euclidean distance between the two axis vectors. */
  readonly distance: number;
  /** Tags whose strength shifted by > 0.15. */
  readonly significantShifts: { tag: string; from: number; to: number }[];
  /** Narratives that appeared (not in old snapshot). */
  readonly emergedNarratives: string[];
  /** Narratives that disappeared. */
  readonly fadedNarratives: string[];
}

// ── Reads ─────────────────────────────────────────────────────────────

export async function getSector(slug: string) {
  return db.sector.findUnique({ where: { slug } });
}

export async function listSectors(countryCode?: string) {
  if (countryCode) {
    return db.sector.findMany({
      where: { countryCodes: { has: countryCode } },
      orderBy: { name: "asc" },
    });
  }
  return db.sector.findMany({ orderBy: { name: "asc" } });
}

export async function getSectorAxis(slug: string): Promise<SectorAxis | null> {
  const sector = await db.sector.findUnique({ where: { slug }, select: { culturalAxis: true } });
  if (!sector?.culturalAxis) return null;
  return sector.culturalAxis as unknown as SectorAxis;
}

export async function getDominantNarratives(slug: string): Promise<string[]> {
  const sector = await db.sector.findUnique({ where: { slug }, select: { dominantNarratives: true } });
  return sector?.dominantNarratives ?? [];
}

// ── Tarsis ingestion → axis computation ───────────────────────────────

/**
 * Compute SectorAxis from a list of Tarsis signals (weak-signals captured
 * by Seshat). Each signal has tags and a strength; we aggregate into a
 * normalized orientation vector.
 *
 * Inputs are kept loose (unknown[]) to avoid coupling to Tarsis types.
 */
export function computeAxisFromSignals(signals: readonly { tags?: Record<string, number>; weight?: number }[]): SectorAxis {
  const acc: Record<string, number> = {};
  let totalWeight = 0;
  for (const s of signals) {
    const w = s.weight ?? 1;
    totalWeight += w;
    for (const [tag, strength] of Object.entries(s.tags ?? {})) {
      acc[tag] = (acc[tag] ?? 0) + strength * w;
    }
  }
  if (totalWeight === 0) return { tags: {}, confidence: 0, samples: 0 };

  const tags: Record<string, number> = {};
  for (const [tag, sum] of Object.entries(acc)) {
    tags[tag] = Math.min(1, sum / totalWeight);
  }
  const confidence = Math.min(1, signals.length / 30); // saturates at 30 signals
  return { tags, confidence, samples: signals.length };
}

export function computeNarratives(signals: readonly { narrative?: string; weight?: number }[]): { narrative: string; weight: number }[] {
  const acc: Record<string, number> = {};
  for (const s of signals) {
    if (!s.narrative) continue;
    acc[s.narrative] = (acc[s.narrative] ?? 0) + (s.weight ?? 1);
  }
  return Object.entries(acc)
    .map(([narrative, weight]) => ({ narrative, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);
}

// ── Writes ────────────────────────────────────────────────────────────

export interface RefreshSectorInput {
  readonly slug: string;
  readonly signals: readonly {
    readonly tags?: Record<string, number>;
    readonly narrative?: string;
    readonly weight?: number;
  }[];
}

export async function refreshSectorOverton(input: RefreshSectorInput) {
  const sector = await db.sector.findUnique({ where: { slug: input.slug } });
  if (!sector) {
    throw new Error(`sector-intelligence: sector '${input.slug}' not found`);
  }

  const axis = computeAxisFromSignals(input.signals);
  const narratives = computeNarratives(input.signals);
  const takenAt = new Date().toISOString();

  const snapshot: OvertonSnapshot = { takenAt, axis, narratives };

  await db.sector.update({
    where: { slug: input.slug },
    data: {
      culturalAxis: axis as unknown as Prisma.InputJsonValue,
      dominantNarratives: narratives.map((n) => n.narrative),
      overtonState: snapshot as unknown as Prisma.InputJsonValue,
      lastObservedAt: new Date(takenAt),
    },
  });

  return snapshot;
}

// ── Drift ─────────────────────────────────────────────────────────────

export function detectDrift(prev: OvertonSnapshot, curr: OvertonSnapshot): SectorDrift {
  const allTags = new Set([...Object.keys(prev.axis.tags), ...Object.keys(curr.axis.tags)]);
  let sumSquares = 0;
  const shifts: { tag: string; from: number; to: number }[] = [];
  for (const tag of allTags) {
    const from = prev.axis.tags[tag] ?? 0;
    const to = curr.axis.tags[tag] ?? 0;
    const diff = to - from;
    sumSquares += diff * diff;
    if (Math.abs(diff) > 0.15) shifts.push({ tag, from, to });
  }
  const distance = Math.sqrt(sumSquares);

  const prevSet = new Set(prev.narratives.map((n) => n.narrative));
  const currSet = new Set(curr.narratives.map((n) => n.narrative));
  const emerged = [...currSet].filter((n) => !prevSet.has(n));
  const faded = [...prevSet].filter((n) => !currSet.has(n));

  return {
    fromSnapshotAt: prev.takenAt,
    toSnapshotAt: curr.takenAt,
    distance,
    significantShifts: shifts.sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from)),
    emergedNarratives: emerged,
    fadedNarratives: faded,
  };
}

// ── Brand-vs-Sector positioning (Overton bend signal) ─────────────────

/**
 * Given a brand's pillar D content (positioning) and the sector axis,
 * compute how much the brand DEFLECTS the sector axis. This is the
 * direct Overton-shift indicator surfaced to the founder via the
 * <OvertonRadar> component.
 *
 * Returns:
 *   - alignment: 0..1 — how aligned the brand is with current sector center
 *   - deflectionVector: tags where the brand pulls the axis
 *   - deflectionMagnitude: scalar magnitude of pull
 */
export interface BrandDeflection {
  alignment: number;
  deflectionVector: Record<string, number>;
  deflectionMagnitude: number;
}

export function computeBrandDeflection(
  brandTags: Record<string, number>,
  sectorAxis: SectorAxis,
): BrandDeflection {
  const allTags = new Set([...Object.keys(brandTags), ...Object.keys(sectorAxis.tags)]);
  const deflection: Record<string, number> = {};
  let alignDot = 0;
  let alignNormA = 0;
  let alignNormB = 0;
  let magnitudeSquares = 0;

  for (const tag of allTags) {
    const b = brandTags[tag] ?? 0;
    const s = sectorAxis.tags[tag] ?? 0;
    deflection[tag] = b - s;
    alignDot += b * s;
    alignNormA += b * b;
    alignNormB += s * s;
    magnitudeSquares += (b - s) * (b - s);
  }
  const alignment = alignNormA && alignNormB ? alignDot / Math.sqrt(alignNormA * alignNormB) : 0;
  const magnitude = Math.sqrt(magnitudeSquares);
  return { alignment, deflectionVector: deflection, deflectionMagnitude: magnitude };
}
