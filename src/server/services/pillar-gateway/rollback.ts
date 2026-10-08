/** ADR-0207 — targeted compensation through the existing governed gateway.
 * Archives without an applied checkpoint, ambiguous writes and conflicts refuse.
 */
import { db } from "@/lib/db";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { writePillarAndScore } from "./index";

export interface RollbackPillarArgs {
  strategyId: string;
  /** Pilier à restaurer (casse indifférente — normalisée en minuscule). */
  pillarKey: PillarKey | string;
  /** IntentEmission de l'écriture à annuler (`compensatedFrom`). */
  compensatedFrom: string;
  operatorId?: string;
  intentId?: string;
  reason: string;
}

export interface RollbackPillarResult {
  restored: boolean;
  reason: string;
  pillarKey: string;
  /** Version de la PillarVersion source (l'instantané pré-écriture restauré). */
  restoredFromVersion?: number;
  alreadyRecorded?: boolean;
  version?: number;
}

/**
 * Restaure un pilier à l'état d'AVANT l'intent `compensatedFrom`, via le gateway.
 * Déterministe, zéro LLM. Handler de l'Intent gouverné `ROLLBACK_PILLAR`.
 */
export async function rollbackPillar(args: RollbackPillarArgs): Promise<RollbackPillarResult> {
  const key = String(args.pillarKey).toLowerCase();

  const pillar = await db.pillar.findUnique({
    where: { strategyId_key: { strategyId: args.strategyId, key } },
    select: { id: true, currentVersion: true },
  });
  if (!pillar) {
    return { restored: false, reason: `Pilier ${key.toUpperCase()} introuvable pour cette marque.`, pillarKey: key };
  }

  const snapshots = await db.pillarVersion.findMany({
    where: { pillarId: pillar.id, intentId: args.compensatedFrom },
    take: 2,
    select: { id: true, version: true },
  });
  if (snapshots.length > 1) return { restored: false, pillarKey: key,
    reason: "RESTORE_AMBIGUOUS: plusieurs écritures de ce pilier portent cette intention." };
  const snapshot = snapshots[0];
  if (!snapshot) {
    return {
      restored: false,
      reason:
        "Restauration précise indisponible : cette écriture est antérieure au suivi de version par intention (aucun instantané pré-écriture n'y est lié). Une édition manuelle explicite reste possible.",
      pillarKey: key,
    };
  }

  const result = await writePillarAndScore({
    strategyId: args.strategyId,
    pillarKey: key as PillarKey,
    operation: { type: "RESTORE_VERSION", versionId: snapshot.id, compensatedFrom: args.compensatedFrom },
    author: {
      system: "OPERATOR",
      userId: args.operatorId,
      intentId: args.intentId,
      reason: `Rollback de l'intent ${args.compensatedFrom} — ${args.reason}`,
    },
    options: { expectedVersion: pillar.currentVersion },
  });
  if (!result.success) {
    return { restored: false, reason: result.error ?? "Échec de la restauration au gateway.", pillarKey: key };
  }

  return {
    restored: true,
    reason: result.noOp ? "La compensation de cette écriture est déjà enregistrée ; aucun nouvel effet."
      : `Effets de l’intention ${args.compensatedFrom} compensés sur le pilier ${key.toUpperCase()}.`,
    alreadyRecorded: !!result.noOp,
    version: result.version,
    pillarKey: key,
    restoredFromVersion: snapshot.version,
  };
}
