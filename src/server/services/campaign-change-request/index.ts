/**
 * CampaignChangeRequest service handlers (Phase 18-A1-β, audit MATANGA V4 TICKETS MODIFS).
 */

import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import type { CampaignChangeRequest, ChangeRequestImpact, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { generateChangeRequestCode } from "@/domain/campaign-code";
import { assertCampaignScope, CampaignScopeError as ChangeRequestError, type CampaignScope } from "@/server/services/operator-isolation";
export { CampaignScopeError as ChangeRequestError } from "@/server/services/operator-isolation";

type HandlerResult = Pick<IntentResult, "status" | "summary" | "tool" | "output" | "reason" | "estimatedCost">;
type CreateIntent = Extract<Intent, { kind: "OPERATOR_CREATE_CHANGE_REQUEST" }>;
type UpdateIntent = Extract<Intent, { kind: "OPERATOR_UPDATE_CHANGE_REQUEST" }>;
type ResolveIntent = Extract<Intent, { kind: "OPERATOR_RESOLVE_CHANGE_REQUEST" }>;
type EscalateIntent = Extract<Intent, { kind: "OPERATOR_ESCALATE_CHANGE_REQUEST" }>;

const ZERO_COST = { amount: 0, currency: "USD" } as const;

function vetoed(tool: string, msg: string): HandlerResult {
  return {
    status: "VETOED",
    summary: msg,
    tool,
    reason: msg.includes("not found") ? "NOT_FOUND" : msg.includes("already") ? "ALREADY_RESOLVED" : "VALIDATION_FAILED",
    estimatedCost: ZERO_COST,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Intent handlers
// ─────────────────────────────────────────────────────────────────────

export async function createChangeRequestHandler(intent: CreateIntent): Promise<HandlerResult> {
  try {
    const ticket = await createChangeRequest({
      campaignDeliverableId: intent.campaignDeliverableId,
      requestedByName: intent.requestedByName,
      description: intent.description,
      impact: intent.impact,
      assignedToUserId: intent.assignedToUserId ?? null,
      strategyId: intent.strategyId, operatorId: intent.operatorId, requestId: intent.requestId,
    });
    return {
      status: "OK",
      summary: `Ticket ${ticket.ticketCode} reçu (impact: ${ticket.impact})${ticket.impact === "MAJOR" ? " — arbitrage recommandé" : ""}`,
      tool: "campaign-change-request.create",
      output: { id: ticket.id, ticketCode: ticket.ticketCode },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("campaign-change-request.create", err instanceof Error ? err.message : String(err));
  }
}

export async function updateChangeRequestHandler(intent: UpdateIntent): Promise<HandlerResult> {
  try {
    const ticket = await updateChangeRequest(intent.ticketId, intent.patches, intent);
    return {
      status: "OK",
      summary: `Ticket ${ticket.ticketCode} mis à jour (status=${ticket.status})`,
      tool: "campaign-change-request.update",
      output: { id: ticket.id, status: ticket.status },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("campaign-change-request.update", err instanceof Error ? err.message : String(err));
  }
}

export async function resolveChangeRequestHandler(intent: ResolveIntent): Promise<HandlerResult> {
  try {
    const ticket = await resolveChangeRequest(intent.ticketId, intent.resolutionNotes, intent.newBriefVersionId ?? null, intent);
    return {
      status: "OK",
      summary: `Ticket ${ticket.ticketCode} résolu`,
      tool: "campaign-change-request.resolve",
      output: { id: ticket.id, resolvedAt: ticket.resolvedAt },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("campaign-change-request.resolve", err instanceof Error ? err.message : String(err));
  }
}

export async function escalateChangeRequestHandler(intent: EscalateIntent): Promise<HandlerResult> {
  try {
    const ticket = await escalateChangeRequest(intent.ticketId, intent.escalationNotes, intent);
    return {
      status: "OK",
      summary: `Ticket ${ticket.ticketCode} escaladé`,
      tool: "campaign-change-request.escalate",
      output: { id: ticket.id, status: ticket.status },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("campaign-change-request.escalate", err instanceof Error ? err.message : String(err));
  }
}

// ─────────────────────────────────────────────────────────────────────
// Business helpers
// ─────────────────────────────────────────────────────────────────────

export type ChangeRequestScope = CampaignScope;
export interface CreateChangeRequestArgs extends ChangeRequestScope {
  campaignDeliverableId: string;
  requestedByName: string;
  description: string;
  impact: ChangeRequestImpact;
  assignedToUserId: string | null;
  /** Explicit retry identity, stored in the existing ticket primary key. */
  requestId?: string;
}

type Transaction = Prisma.TransactionClient;
async function scopedDeliverable(tx: Transaction, id: string, scope: ChangeRequestScope) {
  const row = await tx.campaignDeliverable.findUnique({ where: { id }, select: {
    id: true, taskCode: true, campaignId: true,
  } });
  if (!row) throw new ChangeRequestError("NOT_FOUND", "Livrable introuvable.");
  await assertCampaignScope(row.campaignId, scope, tx);
  return row;
}
async function scopedTicket(tx: Transaction, id: string, scope: ChangeRequestScope) {
  await tx.$queryRaw`SELECT "id" FROM "CampaignChangeRequest" WHERE "id" = ${id} FOR UPDATE`;
  const row = await tx.campaignChangeRequest.findUnique({ where: { id } });
  if (!row) throw new ChangeRequestError("NOT_FOUND", "Ticket introuvable.");
  const deliverable = await scopedDeliverable(tx, row.campaignDeliverableId, scope);
  return { row, deliverable };
}
async function checkAssignee(tx: Transaction, id: string | null | undefined, operatorId: string) {
  if (!id) return;
  const user = await tx.user.findUnique({ where: { id }, select: { operatorId: true } });
  if (!user || user.operatorId !== operatorId) {
    throw new ChangeRequestError("FORBIDDEN", "Le responsable doit appartenir à l’équipe de ce livrable.");
  }
}
function assertOpen(status: string) {
  if (status === "RESOLVED" || status === "REJECTED") {
    throw new ChangeRequestError("CONFLICT", "Ticket clôturé : conserver ce reçu et ouvrir une nouvelle demande.");
  }
}
function nonBlank(value: string | null | undefined, label: string) {
  const text = value?.trim();
  if (!text) throw new ChangeRequestError("BAD_REQUEST", `${label} requis.`);
  return text;
}

export async function createChangeRequest(args: CreateChangeRequestArgs): Promise<CampaignChangeRequest> {
  const requestedByName = nonBlank(args.requestedByName, "Demandeur");
  const description = nonBlank(args.description, "Besoin de modification");
  try {
    return await db.$transaction(async tx => {
      // Same explicit command is serialized across tasks as well as processes.
      if (args.requestId) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`change-request:${args.requestId}`}))`;
      await tx.$queryRaw`SELECT "id" FROM "CampaignDeliverable" WHERE "id" = ${args.campaignDeliverableId} FOR UPDATE`;
      const deliverable = await scopedDeliverable(tx, args.campaignDeliverableId, args);
      if (args.requestId) {
        const previous = await tx.campaignChangeRequest.findUnique({ where: { id: args.requestId } });
        if (previous) {
          if (previous.campaignDeliverableId !== args.campaignDeliverableId ||
              previous.requestedByName !== requestedByName || previous.description !== description ||
              previous.impact !== args.impact || previous.assignedToUserId !== args.assignedToUserId) {
            throw new ChangeRequestError("CONFLICT", "Cette demande a déjà été reçue avec un autre contenu.");
          }
          return previous;
        }
      }
      await checkAssignee(tx, args.assignedToUserId, args.operatorId);
      const baseCode = deliverable.taskCode?.trim() || `DEL-${deliverable.id}`;
      if (deliverable.taskCode && await tx.campaignDeliverable.count({ where: {
        taskCode: deliverable.taskCode, id: { not: deliverable.id },
      } })) throw new ChangeRequestError("CONFLICT", "Code de tâche partagé : qualifier les identités avant de numéroter une reprise.");
      const history = await tx.campaignChangeRequest.findMany({
        where: { campaignDeliverableId: deliverable.id }, select: { ticketCode: true },
      });
      let maxRevision = 0;
      for (const row of history) {
        const suffix = /-R([0-9]+)$/.exec(row.ticketCode);
        const revision = suffix ? Number(suffix[1]) : NaN;
        if (!Number.isSafeInteger(revision) || revision < 1 || revision >= Number.MAX_SAFE_INTEGER) {
          throw new ChangeRequestError("CONFLICT", "Numérotation historique à qualifier avant la prochaine reprise.");
        }
        maxRevision = Math.max(maxRevision, revision);
      }
      return tx.campaignChangeRequest.create({ data: {
        ...(args.requestId ? { id: args.requestId } : {}),
        ticketCode: generateChangeRequestCode(baseCode, maxRevision + 1),
        campaignDeliverableId: deliverable.id, requestedByName, description,
        impact: args.impact, status: "PENDING", assignedToUserId: args.assignedToUserId,
      } });
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new ChangeRequestError("CONFLICT", "Identité de ticket déjà utilisée ; qualifier la numérotation sans renommer l’historique.");
    }
    throw error;
  }
}

export async function updateChangeRequest(ticketId: string, patches: UpdateIntent["patches"], scope: ChangeRequestScope): Promise<CampaignChangeRequest> {
  return db.$transaction(async tx => {
    const { row } = await scopedTicket(tx, ticketId, scope);
    assertOpen(row.status);
    const allowedKeys = ["status", "assignedToUserId", "resolutionNotes", "description", "impact"];
    const data: Prisma.CampaignChangeRequestUpdateInput = {};
    for (const [key, value] of Object.entries(patches)) {
      if (!allowedKeys.includes(key)) throw new ChangeRequestError("BAD_REQUEST", `Champ non modifiable : ${key}.`);
      (data as Record<string, unknown>)[key] = value;
    }
    if (patches.description !== undefined) data.description = nonBlank(patches.description, "Besoin de modification");
    await checkAssignee(tx, patches.assignedToUserId, scope.operatorId);
    if (patches.status === "RESOLVED") {
      data.resolutionNotes = nonBlank(patches.resolutionNotes, "Compte rendu de résolution");
      data.resolvedAt = new Date();
    }
    return tx.campaignChangeRequest.update({ where: { id: ticketId }, data });
  });
}

export async function resolveChangeRequest(ticketId: string, resolutionNotes: string, newBriefVersionId: string | null, scope: ChangeRequestScope): Promise<CampaignChangeRequest> {
  const notes = nonBlank(resolutionNotes, "Compte rendu de résolution");
  return db.$transaction(async tx => {
    const { row, deliverable } = await scopedTicket(tx, ticketId, scope);
    if (row.status === "RESOLVED" && row.resolutionNotes === notes && row.newBriefVersionId === newBriefVersionId) return row;
    assertOpen(row.status);
    if (newBriefVersionId) {
      const brief = await tx.campaignBrief.findUnique({ where: { id: newBriefVersionId }, select: { campaignId: true } });
      if (brief?.campaignId !== deliverable.campaignId) {
        throw new ChangeRequestError("BAD_REQUEST", "La version de brief doit appartenir à la même campagne.");
      }
    }
    return tx.campaignChangeRequest.update({ where: { id: ticketId }, data: {
      status: "RESOLVED", resolutionNotes: notes, newBriefVersionId, resolvedAt: new Date(),
    } });
  });
}

export async function escalateChangeRequest(ticketId: string, escalationNotes: string, scope: ChangeRequestScope): Promise<CampaignChangeRequest> {
  const notes = `[ESCALATED] ${nonBlank(escalationNotes, "Motif d’arbitrage")}`;
  return db.$transaction(async tx => {
    const { row } = await scopedTicket(tx, ticketId, scope);
    assertOpen(row.status);
    if (row.status === "ESCALATED" && row.resolutionNotes?.split("\n").includes(notes)) return row;
    // Local workflow only: this never sends a Slack/Telegram/email message.
    return tx.campaignChangeRequest.update({ where: { id: ticketId }, data: {
      status: "ESCALATED", resolutionNotes: row.resolutionNotes ? `${row.resolutionNotes}\n${notes}` : notes,
    } });
  });
}

// ─────────────────────────────────────────────────────────────────────
// Read helpers
// ─────────────────────────────────────────────────────────────────────

export async function listChangeRequestsForDeliverable(deliverableId: string): Promise<CampaignChangeRequest[]> {
  return db.campaignChangeRequest.findMany({
    where: { campaignDeliverableId: deliverableId },
    orderBy: [{ requestedAt: "desc" }],
  });
}

export async function listOpenChangeRequestsForOperator(operatorId: string): Promise<CampaignChangeRequest[]> {
  return db.campaignChangeRequest.findMany({
    where: {
      status: { in: ["PENDING", "IN_PROGRESS", "ESCALATED"] },
      deliverable: { campaign: { strategy: { operatorId } } },
    },
    orderBy: [{ impact: "asc" }, { requestedAt: "desc" }],
  });
}
