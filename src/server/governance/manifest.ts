/**
 * src/server/governance/manifest.ts — NeteruManifest contract.
 *
 * Layer 2 (governance). Each service under src/server/services/ co-locates a
 * `manifest.ts` that imports from this file and declares:
 *   - which Neteru governs it (MESTOR | ARTEMIS | SESHAT | THOT | INFRASTRUCTURE)
 *   - which Intent kinds it accepts and which it emits
 *   - its capabilities (input/output Zod, side-effects, cost estimate)
 *   - its dependencies on other services
 *   - its semantic version (independent from package.json — versioned per
 *     manifest so plugin compatibility can be checked)
 *
 * The shape is also the contract for external plugins (`--external-plugin`
 * scaffold mode, Phase 2.7).
 */

import type { z } from "zod";
import type { Governor } from "@/domain";

// ── Re-export Governor as Brain for compat with the existing registry ──

export type Brain = Governor;
export const BRAINS: readonly Brain[] = [
  "MESTOR",
  "ARTEMIS",
  "SESHAT",
  "THOT",
  "INFRASTRUCTURE",
] as const;

// ── Capability declaration ────────────────────────────────────────────

export type SideEffect =
  | "DB_WRITE"
  | "DB_READ"
  | "LLM_CALL"
  | "EXTERNAL_API"
  | "EVENT_EMIT"
  | "FILE_WRITE";

/**
 * Pre-condition gates a capability requires on the strategy/pillars
 * BEFORE the handler is allowed to run. Evaluated by `governedProcedure`
 * via `pillar-readiness.assertReadyFor`. Listing them here moves the
 * check from "scattered if-not-ready throws inside the handler" to a
 * declarative contract enforced at the boundary.
 *
 * Without this field the framework caught WHO-can-call-WHO (manifest +
 * lint), but not "is the world in a state where this call makes sense".
 * That is the gap that produced the "Mestor partially filled pillars,
 * UI says complet, sequence then fails" class of bugs.
 */
export type ReadinessGateName =
  | "DISPLAY_AS_COMPLETE"
  | "RTIS_CASCADE"
  | "GLORY_SEQUENCE"
  | "ORACLE_ENRICH"
  | "ORACLE_EXPORT";

export interface Capability<I = unknown, O = unknown> {
  /** Stable name within the service (camelCase). */
  readonly name: string;
  /** Zod schema for the call input. */
  readonly inputSchema: z.ZodSchema<I>;
  /** Zod schema for the call output. */
  readonly outputSchema: z.ZodSchema<O>;
  /** Set of side-effects the capability may produce — used by sandbox + audit. */
  readonly sideEffects: readonly SideEffect[];
  /** Best-effort dollar cost estimate per call (LLM tokens + DB rows + APIs). */
  readonly costEstimateUsd?: number;
  /** Quality tier — drives LLM Gateway routing in Phase 5. */
  readonly qualityTier?: "S" | "A" | "B" | "C";
  /** Latency budget — Gateway prefers faster models when set tightly. */
  readonly latencyBudgetMs?: number;
  /** Idempotency hint for retries / replay. */
  readonly idempotent?: boolean;
  /**
   * Readiness gates the strategy/pillars must satisfy before the handler
   * runs. The dispatcher queries `pillar-readiness` and throws
   * `ReadinessVetoError` (which becomes an `intent.vetoed` event) if any
   * gate fails. The handler does not need a defensive check.
   *
   * If the input does not contain a `strategyId`, the framework skips the
   * preconditions step (logged as a warning).
   */
  readonly preconditions?: readonly ReadinessGateName[];
}

// ── Manifest itself ───────────────────────────────────────────────────

export interface NeteruManifest {
  /** Service slug — must match the directory name under src/server/services/. */
  readonly service: string;
  /** Which Neteru governs this service. */
  readonly governor: Brain;
  /** Manifest schema version (semver). Bump on any breaking change. */
  readonly version: `${number}.${number}.${number}`;
  /** Intent kinds this service can be the target of. */
  readonly acceptsIntents?: readonly string[];
  /** Intent kinds this service emits (e.g. spawned intents). */
  readonly emits?: readonly string[];
  /** Capabilities (one entry per public function). */
  readonly capabilities: readonly Capability[];
  /** Other service slugs this service depends on. */
  readonly dependencies?: readonly string[];
  /** Free-form documentation / pointers. */
  readonly docs?: { readonly url?: string; readonly summary?: string };
}

// ── Glory tool variant (richer pricing tiers, A/B variants) ───────────

export interface GloryToolManifest {
  readonly tool: string;
  readonly governor: "ARTEMIS";
  readonly version: `${number}.${number}.${number}`;
  readonly qualityTier: "S" | "A" | "B" | "C";
  readonly costTier: "PREMIUM" | "STANDARD" | "LITE";
  readonly inputSchema: z.ZodSchema;
  readonly outputSchema: z.ZodSchema;
  readonly expectedLatencyMs: number;
  readonly deterministicSeed: boolean;
  readonly variants?: readonly string[];
  readonly dependencies?: readonly string[];
  readonly pillarsAffected: readonly string[];
}

// ── Helpers ───────────────────────────────────────────────────────────

export function defineManifest(m: NeteruManifest): NeteruManifest {
  return Object.freeze(m);
}

export function defineGloryTool(m: GloryToolManifest): GloryToolManifest {
  return Object.freeze(m);
}
