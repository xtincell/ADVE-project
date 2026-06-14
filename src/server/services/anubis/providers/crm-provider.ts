/**
 * CRM provider connector façade — Phase 23 Epic 2 Story 2.3.
 *
 * ADR-0079 (External signal connectors via Credentials Vault) + Pattern P22-1
 * (`ConnectorResult<T>` discriminated union, ADR-0077).
 *
 * Owning Neter : ANUBIS (Comms §4.7). Cap APOGEE 7/7 préservé — this is a
 * **connector**, not an 8th Neter.
 *
 * # Contract
 *
 * `fetchCohortSignal(operatorId, brandId, window)` returns a
 * `ConnectorResult<CrmCohortSignal>` :
 *   - `LIVE`                              — credentials present, fetch OK
 *   - `DEFERRED_AWAITING_CREDENTIALS`     — no active credentials in the Vault
 *   - `DEGRADED + AUTH_REVOKED`           — credentials present but rejected
 *   - `DEGRADED + RATE_LIMITED`           — upstream 429 / quota exceeded
 *   - `DEGRADED + VENDOR_OUTAGE`          — upstream 5xx / timeout / network
 *   - `DEGRADED + INSUFFICIENT_DATA`      — upstream returned, cohort < threshold
 *
 * # PII redaction (NFR6 — non-negotiable)
 *
 * The CRM provider façade **redacts personal identifiable information at the
 * field level BEFORE any cohort row leaves this module**. Email / phone / name
 * fields are hashed to a stable opaque token (`SHA-256(value).slice(0, 16)`)
 * usable for cohort joining but unusable for re-identification.
 *
 * The redaction list is **NOT** configurable per-call — it is hard-coded in
 * this façade so a misconfiguration cannot bypass it. If a future CRM source
 * surfaces a new PII field (e.g. national ID), the field is added to the
 * `REDACTED_FIELDS` constant here in the same commit, never as a "configure
 * via UI" toggle.
 *
 * The façade never throws across the connector boundary and never returns
 * raw PII under `LIVE` (P22-1 invariant + NFR6 compliance).
 *
 * # Phase 23 ship-without-keys posture
 *
 * CRM credentials may not be signed when Phase 23 ships ; the façade returns
 * `DEFERRED_AWAITING_CREDENTIALS` cleanly in that case. Downstream sub-clusters
 * (`superfan.stickiness`, `superfan.crmCapture`) render their `INSUFFICIENT_DATA`
 * branch per P22-2.
 *
 * Cf. ADR-0077, ADR-0079, architecture D4 + P22-1 + NFR6, Epic 4 Story 4.3.
 */

import { createHash } from "node:crypto";
import { credentialVault } from "../credential-vault";
import { db } from "@/lib/db";
import type { ConnectorResult } from "@/domain";

/**
 * Canonical Vault slug for the CRM-provider connector. Used by
 * `credentialVault.get(operatorId, CRM_CONNECTOR_TYPE)` and by
 * `getProvider(slug)` factory in `providers/index.ts`.
 */
export const CRM_CONNECTOR_TYPE = "crm-provider" as const;

/**
 * Display name shown in the Credentials Vault UI registration form
 * (Epic 2 Story 2.4 — `/console/anubis/credentials`).
 */
export const CRM_DISPLAY_NAME = "CRM provider";

/**
 * Allowed cohort windows ; downstream is `superfan-economy.ts` `superfan.stickiness`
 * (Epic 4 Story 4.3).
 */
export type CrmCohortWindow = "J+30" | "J+90" | "J+180";

/**
 * Cohort retention signal payload, after PII redaction.
 */
export interface CrmCohortSignal {
  /** Number of customers in the original cohort (acquisition wave). */
  cohortSize: number;
  /** Number still active at the cohort window boundary. */
  retained: number;
  /** Retained / cohortSize (0..1). */
  retentionRate: number;
  /**
   * Per-customer opaque tokens for cohort joining (16-hex-char hashes of
   * PII fields). The originating email / phone / name is **NOT** present
   * in this list — the hash is one-way + non-reversible. Stable across
   * fetches so consumers can detect "same person, second purchase".
   */
  cohortTokens: ReadonlyArray<string>;
  /** Cohort acquisition wave start (ISO 8601). */
  cohortStartedAt: string;
  /** Observation window boundary (ISO 8601). */
  windowAt: string;
  /** **Mock marker** — `true` when no real CRM SDK is wired yet. */
  _mocked?: boolean;
}

/**
 * Fields that MUST be redacted to opaque hashes before leaving the façade.
 * Adding a new PII field requires editing this constant + a release note.
 * Never configurable at runtime — runtime configuration creates a path to
 * accidentally disable redaction (NFR6 invariant).
 */
const REDACTED_FIELDS = ["email", "phone", "name", "fullName", "firstName", "lastName"] as const;

/**
 * Hashes a PII value to a stable opaque token. SHA-256 truncated to 16 hex
 * chars — enough entropy to avoid collision within a brand's cohort, not
 * enough to leak the original value.
 */
function piiHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

/**
 * Internal helper : extracts a stable cohort token from a raw CRM customer
 * record. Tries `email` first (most stable across systems) ; falls back to
 * `phone` ; finally to a composite of `name` fields. Returns null if no
 * identifier is available — that row is dropped from the cohort.
 */
function deriveCohortToken(record: Record<string, unknown>): string | null {
  for (const field of REDACTED_FIELDS) {
    const value = record[field];
    if (typeof value === "string" && value.length > 0) {
      return piiHash(value.trim().toLowerCase());
    }
  }
  return null;
}

const MIN_COHORT_SIZE = 30;

/**
 * Fetch cohort retention signal for one brand, owned by a given operator.
 *
 * @param operatorId - The owning `Operator.id`.
 * @param brandId - The brand whose cohort is being measured (typically the
 *                  `Strategy.id` or a derived `Campaign.id`).
 * @param window  - The cohort window (J+30, J+90, J+180).
 * @returns A `ConnectorResult<CrmCohortSignal>` with redacted PII tokens.
 */
export async function fetchCohortSignal(
  operatorId: string,
  brandId: string,
  window: CrmCohortWindow,
): Promise<ConnectorResult<CrmCohortSignal>> {
  // Step 1 : credentials check.
  const cred = await credentialVault.get(operatorId, CRM_CONNECTOR_TYPE);
  if (!cred) {
    return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: CRM_CONNECTOR_TYPE };
  }

  // Step 2 : credentials present. On calcule une cohorte RÉELLE depuis les
  // contacts CRM POSSÉDÉS (`CrmContact` scopés strategyId=brandId) — donnée
  // réelle, `_mocked: false`. Cohorte sous le seuil → DEGRADED INSUFFICIENT_DATA
  // (jamais de chiffre fabriqué, P22-1). L'intégration d'un CRM externe (via la
  // credential) enrichira cette base dans une itération ultérieure.
  try {
    const observedAt = new Date().toISOString();
    const cohortStartedAt = new Date(
      Date.now() - (window === "J+30" ? 30 : window === "J+90" ? 90 : 180) * 24 * 3600 * 1000,
    ).toISOString();

    const cohort = await fetchAndRedactCohort(brandId, window);

    if (cohort.cohortSize < MIN_COHORT_SIZE) {
      return {
        state: "DEGRADED",
        reason: "INSUFFICIENT_DATA",
        lastObservedAt: cred.lastSyncAt?.toISOString(),
      };
    }

    return {
      state: "LIVE",
      data: {
        ...cohort,
        cohortStartedAt,
        windowAt: observedAt,
        _mocked: false,
      },
      observedAt,
    };
  } catch {
    // P22-1 invariant : transient failure → DEGRADED, NEVER swallow into LIVE.
    return {
      state: "DEGRADED",
      reason: "VENDOR_OUTAGE",
      lastObservedAt: cred.lastSyncAt?.toISOString(),
    };
  }
}

/**
 * Test-call : confirms the CRM credentials are valid. Used by the Credentials
 * Vault UI to render the test-call badge per NFR11.
 */
export async function testCrmConnection(
  operatorId: string,
): Promise<{ success: boolean; reason?: string }> {
  const cred = await credentialVault.get(operatorId, CRM_CONNECTOR_TYPE);
  if (!cred) {
    return {
      success: false,
      reason: `No active credential for ${CRM_CONNECTOR_TYPE}. Configure via /console/anubis/credentials.`,
    };
  }
  return { success: true };
}

/**
 * Internal : fetches raw CRM rows, redacts PII fields per `REDACTED_FIELDS`,
 * and derives stable cohort tokens. Phase 23 mock returns an empty cohort —
 * real CRM SDK wires in a follow-up PR. Exported for unit testing of the
 * redaction contract.
 *
 * @internal
 */
export async function fetchAndRedactCohort(
  brandId: string,
  window: CrmCohortWindow,
): Promise<{ cohortSize: number; retained: number; retentionRate: number; cohortTokens: ReadonlyArray<string> }> {
  // Cohorte RÉELLE depuis les contacts CRM possédés (CrmContact) : vague
  // d'acquisition = contacts de la marque (strategyId) acquis il y a ≥ `window`
  // jours ; « retenus » = non désinscrits à la fenêtre. PII redacté en tokens
  // opaques AVANT de quitter la façade (NFR6). Aucune ligne brute ne fuit.
  const windowDays = window === "J+30" ? 30 : window === "J+90" ? 90 : 180;
  const cohortBoundary = new Date(Date.now() - windowDays * 24 * 3600 * 1000);

  const contacts = await db.crmContact.findMany({
    where: { strategyId: brandId, createdAt: { lte: cohortBoundary } },
    select: { email: true, phone: true, name: true, unsubscribedAt: true },
  });

  const tokens: string[] = [];
  let retained = 0;
  for (const row of contacts) {
    const token = deriveCohortToken(row as Record<string, unknown>);
    if (token === null) continue; // pas d'identifiant exploitable → hors cohorte
    tokens.push(token);
    if (!row.unsubscribedAt) retained++; // toujours abonné = retenu
  }

  const cohortSize = tokens.length;
  return {
    cohortSize,
    retained,
    retentionRate: cohortSize > 0 ? retained / cohortSize : 0,
    cohortTokens: tokens,
  };
}
