/**
 * OvertonRadarSignal — Layer-0 presentational view-model for `<OvertonRadar>`
 * (Phase 23 Epic 7, ADR-0078).
 *
 * **Why this lives in `domain/` and not in the component.** The radar is a
 * `"use client"` component (Layer 7). The tRPC query that feeds it (Layer 6,
 * `cockpit-router.overtonSignal`) composes this shape from the sector axis
 * (`sector-intelligence/`) + the Tarsis payload (`ConnectorResult<TarsisSignal>`).
 * A backward import (trpc → component) is forbidden by the layering cascade, so
 * the shared shape sits at Layer 0 where both ends may import it. `TarsisSignal`
 * itself is a Layer-3 server type — never importable into a client component —
 * so the radar consumes this faithful presentational projection instead.
 *
 * Every field is optional at the type level : the radar renders an honest
 * per-axis partial state for absent axes (no fabricated `0`, ADR-0046 /
 * Pattern P22-2). Wrapped in `ConnectorResult<OvertonRadarSignal>` so the
 * three connector states (LIVE / DEFERRED / DEGRADED) drive the UI 1:1.
 */

/** One dated competitor claim-imitation event (Tarsis `claimImitations`). */
export interface OvertonClaimImitation {
  readonly competitorId: string;
  readonly phrase: string;
  readonly observedAt: string;
  readonly sourceUrl?: string;
}

/** One unpaid press mention (Tarsis `unpaidPress`). */
export interface OvertonUnpaidPress {
  readonly publication: string;
  readonly headline: string;
  readonly publishedAt: string;
  readonly sourceUrl?: string;
}

/** Sector cultural-axis vector snapshot (from `sector-intelligence/`). */
export interface OvertonSectorAxis {
  readonly tags: Record<string, number>;
  readonly confidence: number;
  readonly samples: number;
}

export interface OvertonRadarSignal {
  /** Sector cultural-axis vector: tag → strength in [0,1]. `null` when unobserved. */
  readonly sectorAxis: OvertonSectorAxis | null;
  /** Brand orientation derived from pillar D (positioning). */
  readonly brandTags: Record<string, number>;
  /** Fraction (0..1) of brand vocabulary competitors adopted. */
  readonly vocabularyOverlap?: number;
  /** Magnitude of the sector centroid shift in embedding space. */
  readonly embeddingDelta?: number;
  /** Dated competitor claim-imitation events. */
  readonly claimImitations?: ReadonlyArray<OvertonClaimImitation>;
  /** Unpaid press mentions. */
  readonly unpaidPress?: ReadonlyArray<OvertonUnpaidPress>;
  /** Narratives the sector started echoing (Overton+). */
  readonly emergedNarratives?: ReadonlyArray<string>;
  /** Narratives the sector abandoned. */
  readonly fadedNarratives?: ReadonlyArray<string>;
  /** `true` when the upstream returned deterministic mock data (no real SDK). */
  readonly mocked?: boolean;
  /**
   * ADR-0127 — how specifically the sector axis was resolved for the brand's
   * polity: "EXACT" (scale + country), "SCALE_ONLY" (supra-national axis of
   * the scale), "GLOBAL_FALLBACK" (legacy global sector axis — no polity
   * observation exists yet). `null`/absent = axis missing entirely.
   */
  readonly axisPolityResolution?: "EXACT" | "SCALE_ONLY" | "GLOBAL_FALLBACK" | null;
}
