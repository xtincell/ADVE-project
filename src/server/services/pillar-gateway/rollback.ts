/**
 * pillar-gateway/rollback.ts — moteur de restauration RÉEL (G, ADR-0176).
 *
 * # Le trou que ce module ferme
 *
 * `ROLLBACK_PILLAR` était un kind DÉCLARÉ (COMPENSATING_MAP `WRITE_PILLAR →
 * ROLLBACK_PILLAR`) mais SANS handler : le bouton « Compenser » de la console
 * n'enregistrait qu'une ligne d'audit (`executed:false`) — jamais rien n'était
 * restauré. La Loi 1 (conservation d'altitude) était sans dents.
 *
 * # La mécanique réelle
 *
 * Chaque écriture pilier passe par le gateway, qui snapshotte le contenu
 * PRÉ-écriture dans une `PillarVersion` stampée de l'`intentId` courant
 * (`pillar-versioning`). Restaurer « l'état d'avant l'intent X » = réécrire le
 * `content` de la `PillarVersion(intentId=X)` — via le gateway (C5), donc :
 *   - c'est une écriture GOUVERNÉE et scorée (pas de bare `Pillar.content`) ;
 *   - c'est un undo FORWARD-MOVING (l'historique est préservé, la restauration
 *     est elle-même une nouvelle version → ré-annulable). Loi 1 respectée.
 *
 * Précision : sans lien `intentId` (écriture antérieure au suivi), on REFUSE
 * honnêtement plutôt que de deviner « la dernière version » (undo du mauvais
 * écrasement = corruption silencieuse). Jamais de restauration à l'aveugle.
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
  reason: string;
}

export interface RollbackPillarResult {
  restored: boolean;
  reason: string;
  pillarKey: string;
  /** Version de la PillarVersion source (l'instantané pré-écriture restauré). */
  restoredFromVersion?: number;
}

/**
 * Restaure un pilier à l'état d'AVANT l'intent `compensatedFrom`, via le gateway.
 * Déterministe, zéro LLM. Handler de l'Intent gouverné `ROLLBACK_PILLAR`.
 */
export async function rollbackPillar(args: RollbackPillarArgs): Promise<RollbackPillarResult> {
  const key = String(args.pillarKey).toLowerCase();

  const pillar = await db.pillar.findUnique({
    where: { strategyId_key: { strategyId: args.strategyId, key } },
    select: { id: true },
  });
  if (!pillar) {
    return { restored: false, reason: `Pilier ${key.toUpperCase()} introuvable pour cette marque.`, pillarKey: key };
  }

  // La PillarVersion stampée de l'intent visé porte le contenu PRÉ-écriture =
  // exactement l'état à restaurer.
  const snapshot = await db.pillarVersion.findFirst({
    where: { pillarId: pillar.id, intentId: args.compensatedFrom },
    orderBy: { createdAt: "desc" },
    select: { content: true, version: true },
  });
  if (!snapshot) {
    return {
      restored: false,
      reason:
        "Restauration précise indisponible : cette écriture est antérieure au suivi de version par intention (aucun instantané pré-écriture n'y est lié). Restaurez une version depuis l'historique du pilier, ou éditez manuellement.",
      pillarKey: key,
    };
  }

  // Réécriture GOUVERNÉE du contenu antérieur (undo forward-moving, C5). Le
  // contenu était déjà valide à l'époque → `skipValidation` (restitution fidèle,
  // pas de re-validation d'un état historique légitime).
  const result = await writePillarAndScore({
    strategyId: args.strategyId,
    pillarKey: key as PillarKey,
    operation: { type: "REPLACE_FULL", content: (snapshot.content as Record<string, unknown>) ?? {} },
    author: {
      system: "OPERATOR",
      userId: args.operatorId,
      reason: `Rollback de l'intent ${args.compensatedFrom} — ${args.reason}`,
    },
    options: { skipValidation: true },
  });
  if (!result.success) {
    return { restored: false, reason: result.error ?? "Échec de la restauration au gateway.", pillarKey: key };
  }

  return {
    restored: true,
    reason: `Pilier ${key.toUpperCase()} restauré à l'état d'avant l'intent ${args.compensatedFrom}.`,
    pillarKey: key,
    restoredFromVersion: snapshot.version,
  };
}
