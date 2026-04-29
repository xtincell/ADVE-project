/**
 * src/server/services/artemis/tools/glory-manifests.ts
 *
 * Auto-derives a `GloryToolManifest` for each tool in the registry.
 * One file, N manifests, indexed by slug — keeps ergonomics low while
 * still exposing every Glory tool to the audit-governance + LLM Gateway
 * routing + cost tracking pipeline.
 *
 * Mapping logic:
 *   - executionType "LLM"     → qualityTier "S" or "A", costTier "PREMIUM"
 *                                or "STANDARD" depending on layer
 *   - executionType "COMPOSE" → qualityTier "B", costTier "LITE"
 *   - executionType "CALC"    → qualityTier "C", costTier "LITE"
 *
 *   - Layer "CR" (copywriting) and "DC" (creative direction) →
 *     missionStep 2 (Engagement) — they shape touchpoints
 *   - Layer "HYBRID" (operations, workflow) →
 *     missionStep 3 (Accumulation) — they govern delivery cadence
 *   - Layer "BRAND" (visual identity) →
 *     missionStep 1 (Substance) — they encode authenticity
 *
 *   - missionContribution = CHAIN_VIA:artemis (every tool flows through Artemis)
 *
 * Audited by `scripts/audit-mission-drift.ts` and `scripts/inventory-glory-tools.ts`.
 */

import { z } from "zod";
import {
  defineGloryTool,
  type GloryToolManifest,
} from "@/server/governance/manifest";
import {
  ALL_GLORY_TOOLS,
  type GloryToolDef,
  type GloryExecutionType,
  type GloryLayer,
} from "./registry";
import { PILLAR_KEYS, type PillarKey } from "@/domain/pillars";

// ── Mapping helpers ───────────────────────────────────────────────────

function qualityTier(t: GloryToolDef): "S" | "A" | "B" | "C" {
  if (t.executionType === "LLM") return t.layer === "CR" ? "S" : "A";
  if (t.executionType === "COMPOSE") return "B";
  return "C";
}

function costTier(t: GloryToolDef): "PREMIUM" | "STANDARD" | "LITE" {
  if (t.executionType !== "LLM") return "LITE";
  return t.layer === "CR" ? "PREMIUM" : "STANDARD";
}

function expectedLatencyMs(t: GloryToolDef): number {
  if (t.executionType === "LLM") return t.layer === "CR" ? 6000 : 4000;
  if (t.executionType === "COMPOSE") return 200;
  return 50;
}

function deterministicSeed(t: GloryToolDef): boolean {
  // CALC + COMPOSE are deterministic; LLM is not by default
  return t.executionType !== "LLM";
}

function missionStep(layer: GloryLayer): 1 | 2 | 3 | 4 | 5 {
  if (layer === "BRAND") return 1; // substance
  if (layer === "CR" || layer === "DC") return 2; // engagement
  return 3; // hybrid → accumulation
}

function pillarsAffected(t: GloryToolDef): readonly PillarKey[] {
  // Map raw pillar strings to PillarKey, keep only valid ones
  const valid = new Set<string>(PILLAR_KEYS);
  return t.pillarKeys.filter((k) => valid.has(k.toUpperCase())).map((k) => k.toUpperCase()) as readonly PillarKey[];
}

// ── Generic input/output schemas (refined per tool when known) ────────

const GenericInput = z.object({
  strategyId: z.string().optional(),
  pillarValues: z.record(z.string(), z.unknown()).optional(),
  context: z.unknown().optional(),
}).passthrough();

const GenericOutput = z.unknown();

// ── Build a manifest per tool ─────────────────────────────────────────

function buildManifest(t: GloryToolDef): GloryToolManifest {
  return defineGloryTool({
    tool: t.slug,
    governor: "ARTEMIS",
    version: "1.0.0",
    qualityTier: qualityTier(t),
    costTier: costTier(t),
    inputSchema: GenericInput,
    outputSchema: GenericOutput,
    expectedLatencyMs: expectedLatencyMs(t),
    deterministicSeed: deterministicSeed(t),
    dependencies: t.dependencies,
    pillarsAffected: pillarsAffected(t),
    missionContribution: "CHAIN_VIA:artemis",
    missionStep: missionStep(t.layer),
  });
}

// ── Registry as a Map<slug, GloryToolManifest> ────────────────────────

export const GLORY_MANIFESTS: ReadonlyMap<string, GloryToolManifest> = new Map(
  ALL_GLORY_TOOLS.map((t) => [t.slug, buildManifest(t)] as const),
);

export function getGloryToolManifest(slug: string): GloryToolManifest | undefined {
  return GLORY_MANIFESTS.get(slug);
}

export function listGloryManifests(): readonly GloryToolManifest[] {
  return Array.from(GLORY_MANIFESTS.values());
}

/** Stats — how many tools per quality/cost tier. Used by /console/governance/glory-cost. */
export function gloryTierStats(): {
  total: number;
  byQualityTier: Record<"S" | "A" | "B" | "C", number>;
  byCostTier: Record<"PREMIUM" | "STANDARD" | "LITE", number>;
  byLayer: Record<GloryLayer, number>;
  byExecution: Record<GloryExecutionType, number>;
} {
  const stats = {
    total: 0,
    byQualityTier: { S: 0, A: 0, B: 0, C: 0 } as Record<"S" | "A" | "B" | "C", number>,
    byCostTier: { PREMIUM: 0, STANDARD: 0, LITE: 0 } as Record<"PREMIUM" | "STANDARD" | "LITE", number>,
    byLayer: { CR: 0, DC: 0, HYBRID: 0, BRAND: 0 } as Record<GloryLayer, number>,
    byExecution: { LLM: 0, COMPOSE: 0, CALC: 0 } as Record<GloryExecutionType, number>,
  };
  for (const t of ALL_GLORY_TOOLS) {
    stats.total++;
    const m = GLORY_MANIFESTS.get(t.slug);
    if (m) {
      stats.byQualityTier[m.qualityTier]++;
      stats.byCostTier[m.costTier]++;
    }
    stats.byLayer[t.layer]++;
    stats.byExecution[t.executionType]++;
  }
  return stats;
}
