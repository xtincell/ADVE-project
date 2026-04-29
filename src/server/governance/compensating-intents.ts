/**
 * compensating-intents.ts — Reverse maneuvers (APOGEE §10.5).
 *
 * Layer 2. Some Intents are reversible (DB writes that can be undone),
 * others aren't (LLM tokens spent, PDFs sent). This module declares
 * which kinds have a compensating counterpart and provides the
 * `compensate()` entry point that emits the reverse Intent.
 *
 * Mission contribution: GROUND_INFRASTRUCTURE — without reversibility,
 * a misfired cascade pollutes the brand's narrative + audit. Founder
 * trust evaporates.
 */

import type { Intent } from "@/server/services/mestor/intents";
import { db } from "@/lib/db";

/**
 * Map of `originalKind → reverseKind`. Listed kinds are reversible;
 * unlisted kinds are accepted as final and irreversible.
 */
export const COMPENSATING_MAP: Readonly<Record<string, string>> = Object.freeze({
  WRITE_PILLAR: "ROLLBACK_PILLAR",
  FILL_ADVE: "ROLLBACK_ADVE",
  RUN_RTIS_CASCADE: "ROLLBACK_RTIS_CASCADE",
  GENERATE_RECOMMENDATIONS: "DISCARD_RECOMMENDATIONS",
  APPLY_RECOMMENDATIONS: "REVERT_RECOMMENDATIONS",
  PROMOTE_ZOMBIE_TO_FRAGILE: "DEMOTE_FRAGILE_TO_ZOMBIE",
  PROMOTE_FRAGILE_TO_ORDINAIRE: "DEMOTE_ORDINAIRE_TO_FRAGILE",
  PROMOTE_ORDINAIRE_TO_FORTE: "DEMOTE_FORTE_TO_ORDINAIRE",
  PROMOTE_FORTE_TO_CULTE: "DEMOTE_CULTE_TO_FORTE",
  PROMOTE_CULTE_TO_ICONE: "DEMOTE_ICONE_TO_CULTE",
});

export const IRREVERSIBLE_KINDS: ReadonlySet<string> = new Set([
  // Once a deliverable is sent / a PDF generated / an LLM token spent —
  // the world has seen it; we can record a "void" but we can't unsee.
  "EXPORT_ORACLE",
  "EXPORT_RTIS_PDF",
  "INVOKE_GLORY_TOOL",
  "EXECUTE_GLORY_SEQUENCE",
  "PROCESS_SESHAT_SIGNAL",
  "RUN_BOOT_SEQUENCE",
  "ACTIVATE_RETAINER",
  "RECORD_COST",
]);

export function isReversible(kind: string): boolean {
  return Boolean(COMPENSATING_MAP[kind]);
}

export function compensatingKind(kind: string): string | null {
  return COMPENSATING_MAP[kind] ?? null;
}

/** Used by audit-governance to ensure no PROMOTE_* lacks a DEMOTE_*. */
export function listMissingCompensators(allIntentKinds: readonly string[]): string[] {
  const missing: string[] = [];
  for (const kind of Object.keys(COMPENSATING_MAP)) {
    if (!allIntentKinds.includes(kind)) continue;
    const reverse = COMPENSATING_MAP[kind]!;
    if (!allIntentKinds.includes(reverse)) missing.push(reverse);
  }
  return missing;
}

/**
 * Compensate a previously-emitted Intent. Returns the reverse intent ready
 * to be emitted via mestor.emitIntent(). Caller is responsible for the
 * actual emission so the audit-trail flow is consistent.
 */
export interface CompensateInput {
  readonly originalIntentId: string;
  readonly reason: string;
  /** Optional payload override for the reverse intent. */
  readonly payloadOverride?: Record<string, unknown>;
}

export interface CompensateResult {
  readonly reverseIntent: Intent;
  readonly originalKind: string;
  readonly reverseKind: string;
}

export async function buildCompensatingIntent(input: CompensateInput): Promise<CompensateResult> {
  const original = await db.intentEmission.findUnique({
    where: { id: input.originalIntentId },
    select: { id: true, intentKind: true, payload: true, strategyId: true, status: true },
  });
  if (!original) {
    throw new Error(`compensating-intents: original intent ${input.originalIntentId} not found`);
  }
  if (original.status !== "OK") {
    throw new Error(`compensating-intents: cannot compensate intent in status=${original.status}`);
  }
  if (IRREVERSIBLE_KINDS.has(original.intentKind)) {
    throw new Error(`compensating-intents: ${original.intentKind} is declared irreversible`);
  }
  const reverseKind = compensatingKind(original.intentKind);
  if (!reverseKind) {
    throw new Error(`compensating-intents: no compensator declared for ${original.intentKind}`);
  }

  const reverseIntent = {
    kind: reverseKind,
    strategyId: original.strategyId,
    compensatedFrom: input.originalIntentId,
    reason: input.reason,
    ...(input.payloadOverride ?? {}),
  } as unknown as Intent;

  return {
    reverseIntent,
    originalKind: original.intentKind,
    reverseKind,
  };
}
