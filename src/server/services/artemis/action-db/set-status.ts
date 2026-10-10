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
 * calendrier ADR-0131) reste au routeur — ce handler est le chemin d'écriture. SELECT versionne le statut source I dans la même
 * transaction que la projection ; TIMING ne réarme jamais le terminé/annulé.
 */
import { randomUUID } from "node:crypto";
import { normalizeInitiative, mapInitiativeEntries } from "@/lib/types/pillar-schemas";
import { withPillarTransaction, type PillarWriteRequest } from "@/server/services/pillar-gateway";

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
  userId?: string;
  intentId?: string;
}): Promise<SetBrandActionStatusResult> {
  const { strategyId, op } = args;
  return withPillarTransaction(strategyId, async (tx, write) => {
    await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id = ${strategyId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "BrandAction" WHERE "strategyId" = ${strategyId} FOR UPDATE`;

    if (op.type === "SELECT" || op.type === "TIMING") {
      const action = await tx.brandAction.findFirst({ where: { id: op.actionId, strategyId } });
      if (!action) throw new Error("ACTION_NOT_FOUND: action introuvable pour cette marque.");
      if (op.type === "SELECT") {
        if (action.status === "CANCELLED" && op.selected) throw new Error("ACTION_TERMINAL: une action annulée ne peut être retenue sans décision de reprise.");
        const pillar = await tx.pillar.findUnique({ where: { strategyId_key: { strategyId, key: "i" } } });
        const content = structuredClone((pillar?.content ?? {}) as Record<string, unknown>);
        let sourceId = action.sourceInitiativeId;
        if (sourceId?.includes(".")) throw new Error("INITIATIVE_ID_REQUIRES_RECONCILIATION: identifiant source non réconcilié.");
        const provenance = (content._fieldProvenance ?? {}) as Record<string, unknown>;
        let found = 0;
        const changedKeys = new Set<string>();
        const status = op.selected ? "SELECTED_FOR_ROADMAP" : "RECOMMENDED";
        mapInitiativeEntries(content, (raw, key) => {
          if (normalizeInitiative(raw).id !== sourceId) return raw;
          found++;
          const entry = raw && typeof raw === "object" ? raw as Record<string, unknown> : { action: raw };
          if (entry.status === status && provenance[`initiatives.${sourceId}.status`] === "HUMAN") return raw;
          changedKeys.add(key);
          return { ...entry, id: sourceId, status };
        });
        // A manual proposal acquires its identity from its actual definition,
        // once. Missing format/objective remain a partial draft, never invented.
        if (!sourceId && action.source !== "MATERIALIZED") {
          sourceId = randomUUID();
          const cat = (content.catalogueParCanal ?? {}) as Record<string, unknown>;
          const group = action.touchpoint ?? "GENERAL";
          const arr = cat[group];
          if (arr !== undefined && !Array.isArray(arr)) throw new Error("INITIATIVE_SOURCE_SHAPE_INVALID");
          cat[group] = [...(arr as unknown[] ?? []), { id: sourceId, action: action.title,
            ...(action.description ? { objectif: action.description } : {}),
            ...(action.budgetMin !== null && action.budgetMin === action.budgetMax ? { budget: action.budgetMin } : {}), status }];
          content.catalogueParCanal = cat;
          changedKeys.add("catalogueParCanal"); found++;
        }
        if (!found) throw new Error("INITIATIVE_SOURCE_MISSING: la proposition source doit être réconciliée avant ce choix.");
        if (changedKeys.size) {
          const request: PillarWriteRequest = { strategyId, pillarKey: "i",
            operation: { type: "SET_FIELDS", fields: [...changedKeys].map(path => ({ path, value: content[path] })) },
            author: { system: "MESTOR", userId: args.userId, intentId: args.intentId, reason: `Choix opérateur d'action : ${status}` },
            options: { expectedVersion: pillar?.currentVersion ?? 1, shapeGate: true, targetStatus: "AI_PROPOSED",
              rejectOnProvenanceRefusal: true, fieldProvenance: { [`initiatives.${sourceId}.status`]: "HUMAN" } } };
          await write(request);
        } else if (pillar?.validationStatus === "LOCKED" && action.selected !== op.selected) {
          throw new Error("INITIATIVE_SOURCE_LOCKED");
        }
        const statusAfter = ["EXECUTED", "CANCELLED"].includes(action.status) ? action.status
          : op.selected ? (action.timingStart ? "SCHEDULED" : "ACCEPTED") : "PROPOSED";
        await tx.brandAction.update({ where: { id: action.id }, data: { sourceInitiativeId: sourceId, selected: op.selected, status: statusAfter } });
        return { op: "SELECT" as const, updated: 1 };
      }
      if (["EXECUTED", "CANCELLED"].includes(action.status)) throw new Error("ACTION_TERMINAL: une échéance terminée ou annulée ne peut être réarmée.");
      await tx.brandAction.update({ where: { id: action.id }, data: {
        timingStart: op.timingStart ? new Date(op.timingStart) : null,
        ...(op.timingEnd !== undefined ? { timingEnd: op.timingEnd ? new Date(op.timingEnd) : null } : {}),
        status: action.selected ? (op.timingStart ? "SCHEDULED" : "ACCEPTED") : "PROPOSED",
      } });
      return { op: "TIMING" as const, updated: 1 };
    }

    const cadence = op.cadenceDays ?? 14;
    const start = op.startDate ? new Date(op.startDate) : new Date();
    const candidates = await tx.brandAction.findMany({ where: { strategyId, selected: true,
      ...(op.onlyUnscheduled ? { timingStart: null } : {}) }, orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: { id: true, status: true, metadata: true } });
    const rows = candidates.filter(a => !["EXECUTED", "CANCELLED"].includes(a.status)
      && !(a.metadata && typeof a.metadata === "object" && !Array.isArray(a.metadata) && a.metadata.socialPublish));
    for (const [index, row] of rows.entries()) {
      const startAt = new Date(start.getTime() + index * cadence * DAY);
      await tx.brandAction.update({ where: { id: row.id }, data: { timingStart: startAt, timingEnd: new Date(startAt.getTime() + DAY), status: "SCHEDULED" } });
    }
    return { op: "AUTOSCHEDULE" as const, updated: rows.length, protectedPublications: candidates.length - rows.length };
  });
}
