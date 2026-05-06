/**
 * CampaignChangeRequest service handlers (Phase 18-A1-β, audit MATANGA V4 TICKETS MODIFS).
 */

import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import type { CampaignChangeRequest, ChangeRequestImpact, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { generateChangeRequestCode } from "@/domain/campaign-code";

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
    });
    return {
      status: "OK",
      summary: `Ticket ${ticket.ticketCode} créé (impact: ${ticket.impact})${ticket.impact === "MAJOR" ? " — escalade Slack recommandée" : ""}`,
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
    const ticket = await updateChangeRequest(intent.ticketId, intent.patches);
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
    const ticket = await resolveChangeRequest(intent.ticketId, intent.resolutionNotes, intent.newBriefVersionId ?? null);
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
    const ticket = await escalateChangeRequest(intent.ticketId, intent.escalationNotes);
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

export interface CreateChangeRequestArgs {
  campaignDeliverableId: string;
  requestedByName: string;
  description: string;
  impact: ChangeRequestImpact;
  assignedToUserId: string | null;
}

export async function createChangeRequest(args: CreateChangeRequestArgs): Promise<CampaignChangeRequest> {
  // Verify deliverable exists + get its taskCode (CampaignDeliverable doesn't have taskCode field yet ;
  // we use the deliverable.id as fallback or a derived form).
  const deliverable = await db.campaignDeliverable.findUnique({
    where: { id: args.campaignDeliverableId },
    select: { id: true, campaignId: true, campaign: { select: { code: true } } },
  });
  if (!deliverable) throw new Error(`CampaignDeliverable ${args.campaignDeliverableId} not found`);

  // Compute next R-number for this deliverable
  const existingRs = await db.campaignChangeRequest.count({
    where: { campaignDeliverableId: args.campaignDeliverableId },
  });
  const nextR = existingRs + 1;

  // Build ticketCode. Si la campaign a un code V4 (FC-TG-PEAK-001) on l'utilise + index .NN dérivé.
  // Sinon fallback sur l'id du deliverable (lossy mais utilisable).
  const baseCode = deliverable.campaign.code ?? `DEL-${args.campaignDeliverableId.slice(0, 8)}`;
  const ticketCode = generateChangeRequestCode(baseCode, nextR);

  return db.campaignChangeRequest.create({
    data: {
      ticketCode,
      campaignDeliverableId: args.campaignDeliverableId,
      requestedByName: args.requestedByName,
      description: args.description,
      impact: args.impact,
      status: "PENDING",
      assignedToUserId: args.assignedToUserId,
    },
  });
}

export async function updateChangeRequest(
  ticketId: string,
  patches: UpdateIntent["patches"],
): Promise<CampaignChangeRequest> {
  const existing = await db.campaignChangeRequest.findUnique({ where: { id: ticketId } });
  if (!existing) throw new Error(`ChangeRequest ${ticketId} not found`);
  if (existing.status === "RESOLVED") throw new Error(`Ticket ${ticketId} already RESOLVED — utiliser un nouveau ticket pour modifs supplémentaires`);

  const allowedKeys = ["status", "assignedToUserId", "resolutionNotes", "description", "impact"];
  const data: Prisma.CampaignChangeRequestUpdateInput = {};
  for (const [key, value] of Object.entries(patches)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`Field "${key}" non modifiable. Allowed: ${allowedKeys.join(", ")}`);
    }
    (data as Record<string, unknown>)[key] = value;
  }
  // Auto-stamp resolvedAt si transition vers RESOLVED.
  if (patches.status === "RESOLVED" && !existing.resolvedAt) {
    (data as Record<string, unknown>).resolvedAt = new Date();
  }

  return db.campaignChangeRequest.update({ where: { id: ticketId }, data });
}

export async function resolveChangeRequest(
  ticketId: string,
  resolutionNotes: string,
  newBriefVersionId: string | null,
): Promise<CampaignChangeRequest> {
  const existing = await db.campaignChangeRequest.findUnique({ where: { id: ticketId } });
  if (!existing) throw new Error(`ChangeRequest ${ticketId} not found`);
  if (existing.status === "RESOLVED") throw new Error(`Ticket already RESOLVED at ${existing.resolvedAt?.toISOString()}`);

  return db.campaignChangeRequest.update({
    where: { id: ticketId },
    data: {
      status: "RESOLVED",
      resolutionNotes,
      newBriefVersionId,
      resolvedAt: new Date(),
    },
  });
}

export async function escalateChangeRequest(
  ticketId: string,
  escalationNotes: string,
): Promise<CampaignChangeRequest> {
  const existing = await db.campaignChangeRequest.findUnique({ where: { id: ticketId } });
  if (!existing) throw new Error(`ChangeRequest ${ticketId} not found`);

  return db.campaignChangeRequest.update({
    where: { id: ticketId },
    data: {
      status: "ESCALATED",
      resolutionNotes: existing.resolutionNotes ? `${existing.resolutionNotes}\n[ESCALATED] ${escalationNotes}` : `[ESCALATED] ${escalationNotes}`,
    },
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
