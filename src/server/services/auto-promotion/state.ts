/**
 * src/server/services/auto-promotion/state.ts — runtime state read-only access.
 *
 * Le quality-gate mode (SOFT/HARD) est stocké comme état dérivé du dernier
 * IntentEmission de kind `TOGGLE_QUALITY_GATE_MODE` (state-as-event-log
 * pattern, cf. ADR-0005 hash-chain immutability). Pas de nouveau model
 * Prisma — l'IntentEmission table EST la source de vérité.
 *
 * Default mode (no TOGGLE Intent yet emitted) : SOFT.
 */

import { db } from "@/lib/db";
import type { QualityGateMode } from "./types";

interface ToggleQualityGatePayload {
  mode: QualityGateMode;
  reason: string;
  toggledAt: string;
}

/**
 * Read the current quality-gate mode from the latest TOGGLE_QUALITY_GATE_MODE
 * IntentEmission. Returns "SOFT" if no emission yet.
 *
 * Cached for 60s in-process to avoid hot-path DB hit on every sequence run.
 */
let cache: { value: QualityGateMode; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getQualityGateMode(): Promise<QualityGateMode> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  const latest = await db.intentEmission.findFirst({
    where: { intentKind: "TOGGLE_QUALITY_GATE_MODE" },
    orderBy: { emittedAt: "desc" },
    select: { payload: true },
  });

  let mode: QualityGateMode = "SOFT";
  if (latest?.payload && typeof latest.payload === "object") {
    const p = latest.payload as Partial<ToggleQualityGatePayload>;
    if (p.mode === "HARD" || p.mode === "SOFT") mode = p.mode;
  }

  cache = { value: mode, expiresAt: now + CACHE_TTL_MS };
  return mode;
}

/** Force cache clear (used by handler post-toggle). */
export function invalidateQualityGateModeCache(): void {
  cache = null;
}

/**
 * Read the soft-mode wiring anchor date — the moment when runQualityGateSoft
 * was first activated in sequence-executor. Used to compute D+7 eligibility.
 *
 * Sources d'autorité (priorité) :
 *  1. env QUALITY_GATE_SOFT_WIRED_AT (ISO date)
 *  2. première émission de TOGGLE_QUALITY_GATE_MODE avec mode "SOFT"
 *  3. fallback : "2026-05-06" (date de wiring Sprint 9)
 */
export async function getQualityGateSoftWiredAt(): Promise<Date> {
  const envDate = process.env.QUALITY_GATE_SOFT_WIRED_AT;
  if (envDate) {
    const parsed = new Date(envDate);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const firstSoft = await db.intentEmission.findFirst({
    where: {
      intentKind: "TOGGLE_QUALITY_GATE_MODE",
      payload: { path: ["mode"], equals: "SOFT" },
    },
    orderBy: { emittedAt: "asc" },
    select: { emittedAt: true },
  });
  if (firstSoft) return firstSoft.emittedAt;

  return new Date("2026-05-06T00:00:00Z");
}
