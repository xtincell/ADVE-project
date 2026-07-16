/**
 * ConnectorResult<T> — discriminated union returned by every external connector
 * façade in Phase 23 (Tarsis-monitoring API, CRM provider, future connectors).
 *
 * **Layer 0** : pure domain. Zero IO, zero Prisma, zero React, zero side effect.
 * Importable from every layer (domain → lib → governance → services → trpc →
 * components → app).
 *
 * Pattern P22-1 (ADR-0077 + ADR-0079). The "ship-without-keys" shape is defined
 * **once** and consumed by every connector façade, every sub-cluster handler,
 * every Glory tool consumer, and every UI component that surfaces signal state.
 *
 * The three states are exhaustive and mutually exclusive :
 *
 * - `LIVE`     — the connector returned real data successfully. The caller may
 *                use `data` freely. `observedAt` is the ISO timestamp when the
 *                upstream source was last polled.
 *
 * - `DEFERRED_AWAITING_CREDENTIALS`
 *              — the connector is registered but has no credentials yet (the
 *                operator has not configured it in the Credentials Vault).
 *                **This is an expected condition** during Phase 23 ship-without-
 *                keys flows (PRD Journey 2) — render an honest empty/degraded
 *                state with a "configure connector" cross-link to
 *                `/console/anubis/credentials`. Never warning/error tone — info
 *                tone (cf. UX-DR12).
 *
 * - `DEGRADED` — the connector is configured but the upstream call failed
 *                transiently or returned insufficient data. The discriminator
 *                `reason` carries the typed cause ; consumers render the
 *                degraded UI accordingly.
 *
 * # Invariants (HARD-test-enforced by tests/unit/governance/phase22-connector-result.test.ts)
 *
 * 1. **Exhaustive state handling.** Every consumer that switches on `state`
 *    must handle all three branches — no `default else`, no implicit fall-through.
 *
 * 2. **Transient failure never returns LIVE.** A `try`/`catch` that swallows a
 *    transport error must escalate to `DEGRADED` with the appropriate `reason`,
 *    never silently return a `LIVE` result with stale or empty `data`. The
 *    no-magic-fallback invariant (ADR-0046) is the root rule.
 *
 * 3. **No fabricated data.** When `state !== "LIVE"`, the caller does NOT have
 *    a `data` field — the discriminated union forbids it at the type level. The
 *    consumer must render an honest empty/degraded state, never a numeric zero
 *    or "—" that the founder could mistake for a real value (Pattern P22-2,
 *    `INSUFFICIENT_DATA` first-class branch in measurement paths).
 *
 * # Example consumer pattern (P22-1 canonical)
 *
 *     const tarsis = await tarsisConnector.fetchSectorSignal(sectorSlug);
 *     switch (tarsis.state) {
 *       case "LIVE":
 *         return sectorIntelligence.refreshSectorOverton({
 *           slug: sectorSlug,
 *           signals: tarsis,
 *         });
 *       case "DEFERRED_AWAITING_CREDENTIALS":
 *         return { state: "INSUFFICIENT_DATA", minSamplesRequired: 7, samplesAvailable: 0 };
 *       case "DEGRADED":
 *         return { state: "INSUFFICIENT_DATA", minSamplesRequired: 7, samplesAvailable: 0 };
 *     }
 *
 * # Anti-pattern (banned by HARD test)
 *
 *     const tarsis = await tarsisConnector.fetchSectorSignal(sectorSlug);
 *     const samples = tarsis.data?.length ?? 0;  // ← silent zero on degraded
 *     return computeOverton(samples);             // ← fabricated downstream
 *
 * Cf. `_bmad-output/planning-artifacts/architecture.md` §"P22-1 ConnectorResult<T>".
 */

import { z } from "zod";

/**
 * Reasons a connector returns DEGRADED instead of LIVE. Each reason maps to a
 * distinct operator-observable cause and a distinct UI message — never collapse
 * to a generic "error" string.
 */
export const CONNECTOR_DEGRADATION_REASONS = [
  /** Upstream returned but the payload was empty or below the minimum signal threshold. */
  "INSUFFICIENT_DATA",
  /** Upstream returned a 5xx, timeout, or network error. Transient — retry later. */
  "VENDOR_OUTAGE",
  /** Upstream returned a 429 or quota-exceeded marker. Back off. */
  "RATE_LIMITED",
  /** Upstream returned a 401/403 — credentials are invalid, revoked, or expired. */
  "AUTH_REVOKED",
  /**
   * A prerequisite the USER can fill is missing (e.g. brand sector not declared).
   * Distinct from INSUFFICIENT_DATA : the unlock is an action, not patience
   * (audit 2026-07-16 `degraded-copy-hides-missing-sector-unlock`).
   */
  "MISSING_PREREQUISITE",
] as const;

export type ConnectorDegradationReason = (typeof CONNECTOR_DEGRADATION_REASONS)[number];

export const ConnectorDegradationReasonSchema = z.enum(CONNECTOR_DEGRADATION_REASONS);

/**
 * The canonical ship-without-keys discriminated union. **Every** external
 * connector façade in Phase 23+ returns this shape — Tarsis-monitoring, CRM
 * provider, and any future connector added via the Credentials Vault.
 *
 * Generic over the payload type `T` only when `state === "LIVE"` — by
 * construction, the three other states carry no payload (the type system
 * forbids accessing `data` on a non-LIVE result).
 */
export type ConnectorResult<T> =
  | {
      state: "LIVE";
      data: T;
      /** ISO 8601 timestamp when the upstream was last polled. */
      observedAt: string;
    }
  | {
      state: "DEFERRED_AWAITING_CREDENTIALS";
      /** Stable connector identifier matching the Credentials Vault registry slug. */
      connectorId: string;
    }
  | {
      state: "DEGRADED";
      reason: ConnectorDegradationReason;
      /** ISO 8601 timestamp of the last LIVE observation, if any. Helps the UI distinguish "never worked" from "worked yesterday". */
      lastObservedAt?: string;
    };

/**
 * Builds a Zod schema that validates a `ConnectorResult<T>` given a Zod schema
 * for `T`. Useful for boundary validation (tRPC procedures, NSP event payloads,
 * persisted snapshots).
 *
 * The runtime schema mirrors the type union exactly — no extra fields, no
 * loose typing.
 */
export function connectorResultSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.discriminatedUnion("state", [
    z.object({
      state: z.literal("LIVE"),
      data: dataSchema,
      observedAt: z.string().min(1),
    }),
    z.object({
      state: z.literal("DEFERRED_AWAITING_CREDENTIALS"),
      connectorId: z.string().min(1),
    }),
    z.object({
      state: z.literal("DEGRADED"),
      reason: ConnectorDegradationReasonSchema,
      lastObservedAt: z.string().min(1).optional(),
    }),
  ]);
}

/**
 * Type guard : `result.state === "LIVE"`. Narrows the union so callers can
 * access `result.data` after the check.
 */
export function isLive<T>(
  result: ConnectorResult<T>,
): result is Extract<ConnectorResult<T>, { state: "LIVE" }> {
  return result.state === "LIVE";
}

/**
 * Type guard : `result.state === "DEFERRED_AWAITING_CREDENTIALS"`.
 */
export function isDeferred<T>(
  result: ConnectorResult<T>,
): result is Extract<ConnectorResult<T>, { state: "DEFERRED_AWAITING_CREDENTIALS" }> {
  return result.state === "DEFERRED_AWAITING_CREDENTIALS";
}

/**
 * Type guard : `result.state === "DEGRADED"`.
 */
export function isDegraded<T>(
  result: ConnectorResult<T>,
): result is Extract<ConnectorResult<T>, { state: "DEGRADED" }> {
  return result.state === "DEGRADED";
}
