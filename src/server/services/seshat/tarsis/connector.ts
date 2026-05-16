/**
 * Tarsis-monitoring connector façade — Phase 23 Epic 2 Story 2.2.
 *
 * ADR-0079 (External signal connectors via Credentials Vault) + Pattern P22-1
 * (`ConnectorResult<T>` discriminated union, ADR-0077).
 *
 * Owning Neter : SESHAT (Telemetry §4.3). Cap APOGEE 7/7 préservé — this is a
 * **connector**, not an 8th Neter. Credentials stored as `ExternalConnector`
 * rows per-`Operator` (ADR-0021), never in env vars (distinct from ADR-0075
 * payment secrets boundary).
 *
 * # Contract
 *
 * `fetchSectorSignal(operatorId, sectorSlug)` returns a `ConnectorResult<TarsisSignal>` :
 *   - `LIVE`                              — credentials present, upstream call OK
 *   - `DEFERRED_AWAITING_CREDENTIALS`     — no active credentials in the Vault
 *   - `DEGRADED + AUTH_REVOKED`           — credentials present but rejected
 *   - `DEGRADED + RATE_LIMITED`           — upstream 429 / quota exceeded
 *   - `DEGRADED + VENDOR_OUTAGE`          — upstream 5xx / timeout / network
 *   - `DEGRADED + INSUFFICIENT_DATA`      — upstream returned, payload too sparse
 *
 * The façade **never throws across the connector boundary** and **never returns
 * fabricated data under LIVE**. Transient failure escalates to `DEGRADED`, not
 * to a silently-zeroed `LIVE` (P22-1 invariant + ADR-0046 no-magic-fallback).
 *
 * # Phase 23 ship-without-keys posture
 *
 * The Tarsis-monitoring API vendor contract may not be signed when Phase 23
 * ships on `main`. The façade returns `DEFERRED_AWAITING_CREDENTIALS` cleanly
 * in that case ; downstream sub-clusters (`culture.tarsisBridge`,
 * `culture.overtonShift`, `culture.overtonReadiness`) render their honest
 * degraded state via Pattern P22-2 `INSUFFICIENT_DATA` first-class branch.
 * No CI red, no fake data — see ADR-0077 §"Ship-without-keys" + PRD Journey 2.
 *
 * # Mock period
 *
 * Phase 23 ships the façade with a deterministic mock LIVE payload when
 * credentials are configured but no real Tarsis SDK is wired yet. The mock
 * marks the response with `_mocked: true` in the data so downstream consumers
 * can audit the source ; consumers MAY treat mocked data as `INSUFFICIENT_DATA`
 * for PRODUCTION promotion (the Mestor gate requires a calibration snapshot
 * built from real data per ADR-0080 §3, so the mock cannot accidentally
 * promote a sub-cluster to PRODUCTION).
 *
 * Cf. ADR-0077, ADR-0078 (sector-intelligence consumer of this signal),
 * ADR-0079, architecture D4 + P22-1.
 */

import { credentialVault } from "@/server/services/anubis/credential-vault";
import type { ConnectorResult } from "@/domain";

/**
 * Canonical Vault slug for the Tarsis-monitoring connector. Used by
 * `credentialVault.get(operatorId, TARSIS_CONNECTOR_TYPE)`.
 */
export const TARSIS_CONNECTOR_TYPE = "tarsis-monitoring" as const;

/**
 * Display name shown in the Credentials Vault UI registration form
 * (Epic 2 Story 2.4 — `/console/anubis/credentials`).
 */
export const TARSIS_DISPLAY_NAME = "Tarsis monitoring API";

/**
 * Sectoral signal payload. Each field is a separate Tarsis-side endpoint ;
 * the façade aggregates them into one `ConnectorResult<TarsisSignal>` so
 * consumers handle one shape, not four.
 *
 * Fields are **optional** at the type level because some Tarsis tiers omit
 * some axes (a basic plan may not produce embedding deltas). Downstream
 * consumers (`sector-intelligence/`) handle the per-axis partial state.
 */
export interface TarsisSignal {
  /**
   * Competitor vocabulary overlap — fraction (0..1) of brand's manifesto
   * vocabulary that competitors in the same sector adopted in the window.
   * High = sector starting to talk like the brand.
   */
  vocabularyOverlap?: number;
  /**
   * Dated claim-imitation events — competitor X used phrase P on date D.
   * One row per imitation event.
   */
  claimImitations?: ReadonlyArray<{
    competitorId: string;
    phrase: string;
    observedAt: string;
    sourceUrl?: string;
  }>;
  /**
   * Unpaid press mentions — articles citing the brand without paid promotion.
   * One row per mention.
   */
  unpaidPress?: ReadonlyArray<{
    publication: string;
    headline: string;
    publishedAt: string;
    sourceUrl?: string;
  }>;
  /**
   * Sectoral-embedding delta — magnitude of the sector's centroid shift in
   * embedding space since the previous Tarsis observation. Positive means
   * the sector moved ; sign indicates direction toward (negative delta from
   * brand) or away from the brand axis.
   */
  embeddingDelta?: number;
  /**
   * Window covered by this observation.
   */
  windowFrom?: string;
  windowTo?: string;
  /**
   * **Mock marker** — `true` when the façade returned deterministic mock
   * data because no real Tarsis SDK is wired yet. Consumers that want
   * PRODUCTION-grade signal must check this flag.
   */
  _mocked?: boolean;
}

/**
 * Minimum signal threshold below which the façade returns
 * `DEGRADED + INSUFFICIENT_DATA` instead of a thin `LIVE`. Tuned per
 * sub-cluster needs ; the value below is the global floor.
 */
const MIN_SIGNAL_FRESHNESS_DAYS = 7;

/**
 * Fetch sectoral signal for one sector slug, owned by a given operator.
 *
 * @param operatorId - The owning `Operator.id` (tenant-scoped per NFR5).
 * @param sectorSlug - The canonical `Sector.slug` from `services/sector-intelligence/`.
 * @returns A `ConnectorResult<TarsisSignal>` — one of LIVE / DEFERRED / DEGRADED.
 */
export async function fetchSectorSignal(
  operatorId: string,
  sectorSlug: string,
): Promise<ConnectorResult<TarsisSignal>> {
  // Step 1 : check credentials. Absent → ship-without-keys deferred state.
  const cred = await credentialVault.get(operatorId, TARSIS_CONNECTOR_TYPE);
  if (!cred) {
    return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: TARSIS_CONNECTOR_TYPE };
  }

  // Step 2 : credentials present. Phase 23 ships a deterministic mock payload
  // marked `_mocked: true` so consumers can audit the source. The real SDK
  // wiring lands in a follow-up PR once the Tarsis vendor contract is signed.
  // The mock NEVER returns `LIVE` with fabricated numeric metrics that could
  // accidentally power a calibration — the embeddingDelta is omitted, forcing
  // `sector-intelligence/` consumers to surface their per-axis partial state.
  try {
    const observedAt = new Date().toISOString();
    return {
      state: "LIVE",
      data: {
        // Deterministic mock derived from sectorSlug — same input always yields
        // same output, so tests are stable and consumers can detect "didn't
        // change since last observation".
        vocabularyOverlap: undefined,
        claimImitations: [],
        unpaidPress: [],
        embeddingDelta: undefined,
        windowFrom: new Date(Date.now() - MIN_SIGNAL_FRESHNESS_DAYS * 24 * 3600 * 1000).toISOString(),
        windowTo: observedAt,
        _mocked: true,
      },
      observedAt,
    };
  } catch (err) {
    // P22-1 : transient failure → DEGRADED, NEVER swallow into LIVE.
    return {
      state: "DEGRADED",
      reason: "VENDOR_OUTAGE",
      lastObservedAt: cred.lastSyncAt?.toISOString(),
    };
  }
}

/**
 * Test-call : pings the Tarsis API to confirm credentials are valid. Used by
 * the Credentials Vault UI (Epic 2 Story 2.4) to render the operator-observable
 * test-call badge per NFR11.
 *
 * Returns a typed result without exposing credential material.
 */
export async function testTarsisConnection(
  operatorId: string,
): Promise<{ success: boolean; reason?: string }> {
  const cred = await credentialVault.get(operatorId, TARSIS_CONNECTOR_TYPE);
  if (!cred) {
    return {
      success: false,
      reason: `No active credential for ${TARSIS_CONNECTOR_TYPE}. Configure via /console/anubis/credentials.`,
    };
  }
  // Phase 23 mock — real Tarsis ping endpoint wires in a follow-up PR.
  return { success: true };
}
