/**
 * artemis/action-db/set-status.ts — mutation GOUVERNÉE du statut/planning d'une
 * BrandAction (handler de l'Intent `SET_BRAND_ACTION_STATUS`).
 *
 * # Le trou que ce module ferme (B2)
 *
 * `actions.setSelected/setTiming/autoSchedule` faisaient des `db.brandAction.*`
 * DIRECTS dans `.mutation()` — sans émission (Q1/Q2 absents). Le header du
 * routeur les justifiait en « read-projection », mais `setTiming`/`autoSchedule`
 * arment `timingStart` que le CRON social consomme pour PUBLIER : ce sont de
 * vraies décisions opérateur avec effet aval, pas des lectures. Désormais elles
 * passent par `emitIntent` (comme `propose` dans le même routeur) → tracées.
 *
 * Déterministe, zéro LLM. Le garde d'accès (`assertCalendarWrite`, zone
 * calendrier ADR-0131) reste au routeur — ce handler est le chemin d'écriture.
 */
import { db } from "@/lib/db";

export type BrandActionStatusOp =
  | { type: "SELECT"; actionId: string; selected: boolean }
  | { type: "TIMING"; actionId: string; timingStart: string | null; timingEnd?: string | null }
  | { type: "AUTOSCHEDULE"; startDate?: string; cadenceDays?: number; onlyUnscheduled?: boolean };

export interface SetBrandActionStatusResult {
  op: BrandActionStatusOp["type"];
  updated: number;
  /** AUTOSCHEDULE seulement : publications sociales armées préservées. */
  protectedPublications?: number;
}

const DAY = 86_400_000;

/**
 * Applique une opération de statut/planning sur les BrandAction d'une stratégie.
 * Toutes les écritures sont scopées `strategyId` (défense en profondeur : le
 * garde d'accès du routeur a déjà validé l'ownership).
 */
export async function setBrandActionStatus(args: {
  strategyId: string;
  op: BrandActionStatusOp;
}): Promise<SetBrandActionStatusResult> {
  const { strategyId, op } = args;

  if (op.type === "SELECT") {
    const res = await db.brandAction.updateMany({
      where: { id: op.actionId, strategyId },
      data: { selected: op.selected, status: op.selected ? "ACCEPTED" : "PROPOSED" },
    });
    return { op: "SELECT", updated: res.count };
  }

  if (op.type === "TIMING") {
    const res = await db.brandAction.updateMany({
      where: { id: op.actionId, strategyId },
      data: {
        timingStart: op.timingStart ? new Date(op.timingStart) : null,
        ...(op.timingEnd !== undefined ? { timingEnd: op.timingEnd ? new Date(op.timingEnd) : null } : {}),
        status: op.timingStart ? "SCHEDULED" : "ACCEPTED",
      },
    });
    return { op: "TIMING", updated: res.count };
  }

  // AUTOSCHEDULE — étalement déterministe par priorité puis ordre de création.
  const cadence = op.cadenceDays ?? 14;
  const start = op.startDate ? new Date(op.startDate) : new Date();
  const candidates = await db.brandAction.findMany({
    where: {
      strategyId,
      selected: true,
      ...(op.onlyUnscheduled ? { timingStart: null } : {}),
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    select: { id: true, status: true, metadata: true },
  });
  // L'étalement administratif ne touche QUE le plan d'actions — jamais les
  // publications sociales armées (leur échéance EST la donnée), ni le terminé/
  // annulé (audit 2026-07-16, `autoschedule-stomps-armed-publications`).
  const rows = candidates.filter((a) => {
    if (a.status === "EXECUTED" || a.status === "CANCELLED") return false;
    const meta = a.metadata as Record<string, unknown> | null;
    if (meta && meta.socialPublish) return false;
    return true;
  });
  let scheduled = 0;
  for (let i = 0; i < rows.length; i++) {
    const s = new Date(start.getTime() + i * cadence * DAY);
    await db.brandAction.update({
      where: { id: rows[i]!.id },
      data: { timingStart: s, timingEnd: new Date(s.getTime() + DAY), status: "SCHEDULED" },
    });
    scheduled++;
  }
  return { op: "AUTOSCHEDULE", updated: scheduled, protectedPublications: candidates.length - rows.length };
}
