/** ADR-0207 — the single pillar restorer, over the existing governed gateway.
 *
 * Every restoration of pillar content from an archive enters here: the journal
 * compensation (`ROLLBACK_PILLAR`, by intent), the history action
 * (`LEGACY_PILLAR_ROLLBACK_VERSION`, by chosen archive) and the Notoria withdrawal
 * (`LEGACY_NOTORIA_REVERT_RECO`, by the intent recorded on the application).
 * They share the version check, the refusals (conflict, insufficient or foreign
 * archive, foreign operator), receipts/certainties/origins, the PillarVersion
 * history and the one-effect identity. Archives without an applied checkpoint,
 * ambiguous writes and conflicts refuse; no archive is guessed.
 */
import { db } from "@/lib/db";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { writePillarAndScore } from "./index";

/** Typed refusal shared by every restoration surface (tRPC codes 404/403/412). */
export type RestoreRefusal = "NOT_FOUND" | "FORBIDDEN" | "PRECONDITION_FAILED";

export interface RollbackPillarArgs {
  strategyId: string;
  /** Pilier à restaurer (casse indifférente — normalisée en minuscule). */
  pillarKey: PillarKey | string;
  /** IntentEmission de l'écriture à annuler (journal, retrait Notoria). */
  compensatedFrom?: string;
  /** Archive choisie dans l'historique du pilier (action d'historique). */
  versionId?: string;
  operatorId?: string;
  intentId?: string;
  reason: string;
}

export interface RollbackPillarResult {
  restored: boolean;
  reason: string;
  pillarKey: string;
  /** Present when `restored` is false: how every surface must answer. */
  refusal?: RestoreRefusal;
  /** Version de la PillarVersion source (l'instantané pré-écriture restauré). */
  restoredFromVersion?: number;
  alreadyRecorded?: boolean;
  version?: number;
}

const FORBIDDEN_CODES = ["RESTORE_ACCESS_REFUSED", "RESTORE_AUTHORITY_REQUIRED", "RESTORE_EMISSION_REQUIRED"];
const NOT_FOUND_CODES = ["RESTORE_PILLAR_NOT_FOUND", "RESTORE_ARCHIVE_UNAVAILABLE"];

/** One mapping from the gateway refusal codes to the answer of every surface. */
export function restoreRefusal(reason: string): RestoreRefusal {
  if (FORBIDDEN_CODES.some(code => reason.startsWith(code))) return "FORBIDDEN";
  if (NOT_FOUND_CODES.some(code => reason.startsWith(code))) return "NOT_FOUND";
  return "PRECONDITION_FAILED";
}

function refused(key: string, reason: string): RollbackPillarResult {
  return { restored: false, reason, pillarKey: key, refusal: restoreRefusal(reason) };
}

/**
 * Restaure un pilier à l'état d'AVANT une écriture, via le gateway (compensation
 * ciblée : les décisions indépendantes ultérieures sont conservées).
 * Déterministe, zéro LLM. Exactement une cible : `compensatedFrom` ou `versionId`.
 */
export async function rollbackPillar(args: RollbackPillarArgs): Promise<RollbackPillarResult> {
  const key = String(args.pillarKey).toLowerCase();
  if (!args.compensatedFrom === !args.versionId) {
    return refused(key, "RESTORE_TARGET_REQUIRED: une écriture ou une archive, exactement une.");
  }

  const pillar = await db.pillar.findUnique({
    where: { strategyId_key: { strategyId: args.strategyId, key } },
    select: { id: true, currentVersion: true },
  });
  if (!pillar) return refused(key, `RESTORE_PILLAR_NOT_FOUND: pilier ${key.toUpperCase()} introuvable pour cette marque.`);

  let snapshot: { id: string; version: number } | undefined;
  if (args.compensatedFrom) {
    const snapshots = await db.pillarVersion.findMany({
      where: { pillarId: pillar.id, intentId: args.compensatedFrom },
      take: 2,
      select: { id: true, version: true },
    });
    if (snapshots.length > 1) return refused(key, "RESTORE_AMBIGUOUS: plusieurs écritures de ce pilier portent cette intention.");
    snapshot = snapshots[0];
    if (!snapshot) {
      return refused(key,
        "RESTORE_ARCHIVE_UNLINKED: restauration précise indisponible, cette écriture est antérieure au suivi de version par intention (aucun instantané pré-écriture n'y est lié). Une édition manuelle explicite reste possible.");
    }
  }

  const target = args.compensatedFrom ? `l'intention ${args.compensatedFrom}` : `la version ${args.versionId}`;
  const result = await writePillarAndScore({
    strategyId: args.strategyId,
    pillarKey: key as PillarKey,
    operation: snapshot
      ? { type: "RESTORE_VERSION", versionId: snapshot.id, compensatedFrom: args.compensatedFrom }
      : { type: "RESTORE_VERSION", versionId: args.versionId! },
    author: {
      system: "OPERATOR",
      userId: args.operatorId,
      intentId: args.intentId,
      reason: `Compensation de ${target} — ${args.reason}`,
    },
    options: { expectedVersion: pillar.currentVersion },
  });
  if (!result.success) return refused(key, result.error ?? "Échec de la restauration au gateway.");

  return {
    restored: true,
    reason: result.noOp ? "La compensation de cette écriture est déjà enregistrée ; aucun nouvel effet."
      : `Effets de ${target} compensés sur le pilier ${key.toUpperCase()}.`,
    alreadyRecorded: !!result.noOp,
    version: result.version,
    pillarKey: key,
    ...(snapshot ? { restoredFromVersion: snapshot.version } : {}),
  };
}
