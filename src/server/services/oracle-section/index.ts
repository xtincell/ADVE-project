/**
 * OracleSection — Service (Phase 21 F-B / ADR-0068)
 *
 * 35 sections × strategyId, lifecycle first-class :
 *
 *   PENDING ──acquireGenerationLock──▶ GENERATING ──recordGenerationSuccess──▶ COMPLETE
 *      ▲                                  │
 *      │                                  └────────recordGenerationFailure────▶ FAILED
 *      │                                                                          │
 *      └──forgetGenerationProgress (operator override) ──────────────────────────┤
 *                                                                                 │
 *   COMPLETE ──markSectionsStale (cascade pillar amend) ──▶ STALE                 │
 *                                                            │                     │
 *   STALE / FAILED ──acquireGenerationLock──▶ GENERATING ────┴─────────────────────┘
 *
 * **Garanties** :
 *
 * 1. **Lock optimistic** — `acquireGenerationLock` génère un token aléatoire
 *    persisté dans `OracleSection.lockToken`. Toute écriture downstream
 *    (success/failure/release) doit fournir ce token, sinon la transition
 *    est REJETÉE (`LOCK_TOKEN_MISMATCH`). Empêche deux générations
 *    simultanées sur la même section.
 *
 * 2. **TTL lock** — `lockExpiresAt` permet à un nouveau caller d'acquérir le
 *    lock si l'ancien a planté sans release (default 25s, override via
 *    `ttlMs`). Évite les deadlocks éternels.
 *
 * 3. **Idempotency seed** — `seedSectionsForStrategy` crée les 35 rows si
 *    manquantes ; ne réécrit jamais une row existante.
 *
 * 4. **staleAt clear on COMPLETE** — `recordGenerationSuccess` reset
 *    `staleAt = null` (le payload est désormais frais).
 *
 * 5. **generationCount monotone** — incrément à chaque acquireGenerationLock,
 *    jamais reset (audit trail brut).
 *
 * Pas de Neter dédié — sub-domaine d'Artemis (Propulsion). Cap APOGEE 7/7
 * préservé.
 */

import { db } from "@/lib/db";
import { Prisma, type OracleTier as PrismaOracleTier, type OracleSectionStatus as PrismaOracleSectionStatus } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";

// ── Types publics ─────────────────────────────────────────────────────

export type OracleTier = PrismaOracleTier;
export type OracleSectionStatus = PrismaOracleSectionStatus;

export interface OracleSectionRow {
  id: string;
  strategyId: string;
  sectionId: number;
  tier: OracleTier;
  status: OracleSectionStatus;
  payload: unknown;
  confidence: number | null;
  lastGenerationStartedAt: Date | null;
  lastGenerationCompletedAt: Date | null;
  lastError: unknown;
  errorCode: string | null;
  generationCount: number;
  version: number;
  staleAt: Date | null;
  lockToken: string | null;
  lockExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcquireLockResult {
  ok: boolean;
  reason?:
    | "ALREADY_LOCKED"
    | "SECTION_NOT_FOUND"
    | "STRATEGY_NOT_FOUND"
    | "INTERNAL_ERROR";
  lockToken?: string;
  section?: OracleSectionRow;
}

export interface RecordResult {
  ok: boolean;
  reason?: "LOCK_TOKEN_MISMATCH" | "SECTION_NOT_FOUND" | "WRONG_STATUS" | "INTERNAL_ERROR";
  section?: OracleSectionRow;
}

const DEFAULT_LOCK_TTL_MS = 25_000; // SLO p95 generation = 25s + marge

// ── Section meta lookup ───────────────────────────────────────────────

interface SectionRegistryRow {
  number: string;
  tier: OracleTier;
}

/** Build SECTION_REGISTRY index keyed by `number → { number, tier }`. */
const REGISTRY_BY_NUMBER: ReadonlyMap<number, SectionRegistryRow> = (() => {
  const map = new Map<number, SectionRegistryRow>();
  for (const meta of SECTION_REGISTRY) {
    const n = Number(meta.number);
    if (!Number.isInteger(n)) continue;
    map.set(n, { number: meta.number, tier: (meta.tier ?? "CORE") as OracleTier });
  }
  return map;
})();

/** Sections to seed for a strategy (1..35). Stable ordering by sectionId. */
function buildSeedRows(strategyId: string): Prisma.OracleSectionCreateManyInput[] {
  const rows: Prisma.OracleSectionCreateManyInput[] = [];
  for (const [sectionId, meta] of REGISTRY_BY_NUMBER) {
    rows.push({ strategyId, sectionId, tier: meta.tier, status: "PENDING" });
  }
  rows.sort((a, b) => a.sectionId - b.sectionId);
  return rows;
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Seed 35 sections for a strategy (idempotent — `skipDuplicates`). Returns
 * count of newly inserted rows.
 */
export async function seedSectionsForStrategy(strategyId: string): Promise<number> {
  const rows = buildSeedRows(strategyId);
  const result = await db.oracleSection.createMany({ data: rows, skipDuplicates: true });
  return result.count;
}

/**
 * List all sections for a strategy (sorted by sectionId asc).
 *
 * **Lazy seed** — si la strategy n'a pas encore les 35 rows (pre-Phase 21
 * strategies + nouvelles strategies créées sans hook auto-seed), on les
 * insère ici en transparence. Idempotent via `skipDuplicates`. La cardinalité
 * `OracleSection` est ainsi auto-réparatrice à chaque lecture.
 */
export async function getSectionsForStrategy(strategyId: string): Promise<OracleSectionRow[]> {
  let rows = await db.oracleSection.findMany({
    where: { strategyId },
    orderBy: { sectionId: "asc" },
  });
  if (rows.length < REGISTRY_BY_NUMBER.size) {
    await seedSectionsForStrategy(strategyId);
    rows = await db.oracleSection.findMany({
      where: { strategyId },
      orderBy: { sectionId: "asc" },
    });
  }
  return rows as OracleSectionRow[];
}

/** Read a single section. */
export async function getSection(
  strategyId: string,
  sectionId: number,
): Promise<OracleSectionRow | null> {
  const row = await db.oracleSection.findUnique({
    where: { strategyId_sectionId: { strategyId, sectionId } },
  });
  return row as OracleSectionRow | null;
}

/**
 * Acquire generation lock + transition → GENERATING. Atomic via Prisma
 * conditional updateMany (count must be 1).
 *
 * Allowed source statuses: PENDING, COMPLETE, FAILED, STALE. Blocked if
 * status=GENERATING and lock is still fresh (`lockExpiresAt > now`). If the
 * lock has expired, the new caller takes over (the previous caller is
 * considered crashed).
 *
 * Returns the new lock token + the updated section row, or `ok=false` with
 * reason. Never throws.
 */
export async function acquireGenerationLock(
  strategyId: string,
  sectionId: number,
  ttlMs: number = DEFAULT_LOCK_TTL_MS,
): Promise<AcquireLockResult> {
  const lockToken = randomBytes(16).toString("hex");
  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + ttlMs);

  const existing = await db.oracleSection.findUnique({
    where: { strategyId_sectionId: { strategyId, sectionId } },
    select: { id: true, status: true, lockExpiresAt: true },
  });
  if (!existing) return { ok: false, reason: "SECTION_NOT_FOUND" };

  // Freshness check: if currently GENERATING with a non-expired lock, refuse.
  if (
    existing.status === "GENERATING" &&
    existing.lockExpiresAt !== null &&
    existing.lockExpiresAt > now
  ) {
    return { ok: false, reason: "ALREADY_LOCKED" };
  }

  // Atomic transition. Match on the previous status seen above to avoid TOCTOU.
  const updated = await db.oracleSection.updateMany({
    where: {
      strategyId,
      sectionId,
      status: existing.status,
      OR: [
        { lockExpiresAt: null },
        { lockExpiresAt: { lte: now } },
        { id: existing.id }, // keep current row if matches
      ],
    },
    data: {
      status: "GENERATING",
      lockToken,
      lockExpiresAt,
      lastGenerationStartedAt: now,
      generationCount: { increment: 1 },
    },
  });

  if (updated.count !== 1) {
    // Someone else won the race.
    return { ok: false, reason: "ALREADY_LOCKED" };
  }

  const section = await db.oracleSection.findUnique({
    where: { strategyId_sectionId: { strategyId, sectionId } },
  });
  return { ok: true, lockToken, section: section as OracleSectionRow };
}

/**
 * Transition GENERATING → COMPLETE. Requires lock token match. Clears
 * `staleAt` (the payload is now fresh) + writes payload + confidence.
 */
export async function recordGenerationSuccess(
  strategyId: string,
  sectionId: number,
  lockToken: string,
  payload: unknown,
  confidence: number | null,
): Promise<RecordResult> {
  const now = new Date();
  const updated = await db.oracleSection.updateMany({
    where: {
      strategyId,
      sectionId,
      status: "GENERATING",
      lockToken,
    },
    data: {
      status: "COMPLETE",
      payload: payload as Prisma.InputJsonValue,
      confidence,
      lastGenerationCompletedAt: now,
      lastError: Prisma.JsonNull,
      errorCode: null,
      staleAt: null, // payload now fresh
      lockToken: null,
      lockExpiresAt: null,
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) {
    return { ok: false, reason: await diagnoseFailure(strategyId, sectionId, lockToken) };
  }
  const section = await db.oracleSection.findUnique({
    where: { strategyId_sectionId: { strategyId, sectionId } },
  });
  return { ok: true, section: section as OracleSectionRow };
}

/**
 * Transition GENERATING → FAILED. Requires lock token match. Persists
 * `lastError` structured + `errorCode`.
 */
export async function recordGenerationFailure(
  strategyId: string,
  sectionId: number,
  lockToken: string,
  args: {
    errorCode: string;
    errorMessage: string;
    attempts?: number;
    zodIssues?: unknown;
  },
): Promise<RecordResult> {
  const now = new Date();
  const errorBody = {
    errorCode: args.errorCode,
    errorMessage: args.errorMessage,
    attempts: args.attempts ?? 1,
    ...(args.zodIssues !== undefined ? { zodIssues: args.zodIssues } : {}),
    failedAt: now.toISOString(),
  };
  const updated = await db.oracleSection.updateMany({
    where: {
      strategyId,
      sectionId,
      status: "GENERATING",
      lockToken,
    },
    data: {
      status: "FAILED",
      lastError: errorBody as Prisma.InputJsonValue,
      errorCode: args.errorCode,
      lockToken: null,
      lockExpiresAt: null,
    },
  });
  if (updated.count !== 1) {
    return { ok: false, reason: await diagnoseFailure(strategyId, sectionId, lockToken) };
  }
  const section = await db.oracleSection.findUnique({
    where: { strategyId_sectionId: { strategyId, sectionId } },
  });
  return { ok: true, section: section as OracleSectionRow };
}

/**
 * Release lock without status change. Used when caller decided to abort
 * before completing or failing (rare). The status reverts to its previous
 * non-GENERATING state if known, otherwise stays GENERATING + lock cleared
 * (new acquireGenerationLock will succeed since lockExpiresAt becomes null).
 *
 * For typical happy-path / error-path, prefer `recordGenerationSuccess` /
 * `recordGenerationFailure` directly.
 */
export async function releaseGenerationLock(
  strategyId: string,
  sectionId: number,
  lockToken: string,
): Promise<RecordResult> {
  const updated = await db.oracleSection.updateMany({
    where: {
      strategyId,
      sectionId,
      lockToken,
    },
    data: {
      lockToken: null,
      lockExpiresAt: null,
    },
  });
  if (updated.count !== 1) {
    return { ok: false, reason: "LOCK_TOKEN_MISMATCH" };
  }
  const section = await db.oracleSection.findUnique({
    where: { strategyId_sectionId: { strategyId, sectionId } },
  });
  return { ok: true, section: section as OracleSectionRow };
}

/**
 * Mark sections as STALE — used by cascade hooks when piliers ADVE source
 * mutent. Only transitions COMPLETE → STALE (PENDING/FAILED stay as-is,
 * GENERATING is left untouched to avoid race with active generation).
 */
export async function markSectionsStale(
  strategyId: string,
  sectionIds: readonly number[],
): Promise<{ count: number }> {
  if (sectionIds.length === 0) return { count: 0 };
  const result = await db.oracleSection.updateMany({
    where: {
      strategyId,
      sectionId: { in: [...sectionIds] },
      status: "COMPLETE",
    },
    data: {
      status: "STALE",
      staleAt: new Date(),
    },
  });
  return { count: result.count };
}

/**
 * Mark ALL sections as STALE for a strategy — used when an upstream change
 * touches every downstream (rare, e.g. major brand pivot). Caller's
 * responsibility to decide if this is appropriate.
 */
export async function markAllSectionsStale(strategyId: string): Promise<{ count: number }> {
  const result = await db.oracleSection.updateMany({
    where: { strategyId, status: "COMPLETE" },
    data: { status: "STALE", staleAt: new Date() },
  });
  return { count: result.count };
}

/**
 * Operator override — reset a section to PENDING (clears payload, error,
 * lock). Use sparingly : preferred path is RETRY via `acquireGenerationLock`.
 */
export async function forgetGenerationProgress(
  strategyId: string,
  sectionId: number,
): Promise<RecordResult> {
  const updated = await db.oracleSection.updateMany({
    where: { strategyId, sectionId },
    data: {
      status: "PENDING",
      payload: Prisma.JsonNull,
      confidence: null,
      lastError: Prisma.JsonNull,
      errorCode: null,
      lockToken: null,
      lockExpiresAt: null,
      lastGenerationStartedAt: null,
      lastGenerationCompletedAt: null,
      staleAt: null,
    },
  });
  if (updated.count !== 1) {
    return { ok: false, reason: "SECTION_NOT_FOUND" };
  }
  const section = await db.oracleSection.findUnique({
    where: { strategyId_sectionId: { strategyId, sectionId } },
  });
  return { ok: true, section: section as OracleSectionRow };
}

// ── Internals ─────────────────────────────────────────────────────────

async function diagnoseFailure(
  strategyId: string,
  sectionId: number,
  expectedLockToken: string,
): Promise<RecordResult["reason"]> {
  const row = await db.oracleSection.findUnique({
    where: { strategyId_sectionId: { strategyId, sectionId } },
    select: { status: true, lockToken: true },
  });
  if (!row) return "SECTION_NOT_FOUND";
  if (row.lockToken !== expectedLockToken) return "LOCK_TOKEN_MISMATCH";
  if (row.status !== "GENERATING") return "WRONG_STATUS";
  return "INTERNAL_ERROR";
}

// ── Manifest exposure for governance ──────────────────────────────────

/**
 * Snapshot of section status for a strategy — convenience for UI and
 * monitoring. Returns { total, pending, generating, complete, failed, stale }.
 */
export async function snapshotStrategy(strategyId: string): Promise<{
  total: number;
  pending: number;
  generating: number;
  complete: number;
  failed: number;
  stale: number;
}> {
  const groups = await db.oracleSection.groupBy({
    by: ["status"],
    where: { strategyId },
    _count: { _all: true },
  });
  const counts = { total: 0, pending: 0, generating: 0, complete: 0, failed: 0, stale: 0 };
  for (const g of groups) {
    const n = g._count._all;
    counts.total += n;
    switch (g.status) {
      case "PENDING": counts.pending = n; break;
      case "GENERATING": counts.generating = n; break;
      case "COMPLETE": counts.complete = n; break;
      case "FAILED": counts.failed = n; break;
      case "STALE": counts.stale = n; break;
    }
  }
  return counts;
}
