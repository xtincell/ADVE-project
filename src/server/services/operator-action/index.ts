/**
 * OperatorAction service handlers (Phase 18-A1-γ, audit MATANGA V4 ACTIONS).
 */

import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import type { OperatorAction, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { CampaignScopeError } from "@/server/services/operator-isolation";

type HandlerResult = Pick<IntentResult, "status" | "summary" | "tool" | "output" | "reason" | "estimatedCost">;
type CreateIntent = Extract<Intent, { kind: "OPERATOR_CREATE_ACTION" }>;
type UpdateIntent = Extract<Intent, { kind: "OPERATOR_UPDATE_ACTION" }>;
type ToggleIntent = Extract<Intent, { kind: "OPERATOR_TOGGLE_ACTION_DONE" }>;
type DeleteIntent = Extract<Intent, { kind: "OPERATOR_DELETE_ACTION" }>;

const ZERO_COST = { amount: 0, currency: "USD" } as const;

function vetoed(tool: string, error: unknown): HandlerResult {
  const msg = error instanceof Error ? error.message : String(error);
  return {
    status: "VETOED",
    summary: msg,
    tool,
    reason: error instanceof CampaignScopeError ? error.code : "VALIDATION_FAILED",
    estimatedCost: ZERO_COST,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Intent handlers
// ─────────────────────────────────────────────────────────────────────

export async function createOperatorActionHandler(intent: CreateIntent): Promise<HandlerResult> {
  try {
    const action = await createOperatorAction({
      strategyId: intent.strategyId,
      operatorId: intent.operatorId,
      label: intent.label,
      context: intent.context ?? null,
      priority: intent.priority ?? "MOYENNE",
      category: intent.category ?? "OTHER",
      source: intent.source ?? "OTHER",
      campaignId: intent.campaignId ?? null,
      deliverableIds: intent.deliverableIds ?? [],
      assigneeUserId: intent.assigneeUserId ?? null,
      dueDate: intent.dueDate ? new Date(intent.dueDate) : null,
    });
    return {
      status: "OK",
      summary: `Action créée : "${action.label}" (${action.priority}/${action.category})`,
      tool: "operator-action.create",
      output: { id: action.id },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("operator-action.create", err);
  }
}

export async function updateOperatorActionHandler(intent: UpdateIntent): Promise<HandlerResult> {
  try {
    const action = await updateOperatorAction(intent.actionId, intent.patches, intent);
    return {
      status: "OK",
      summary: `Action ${action.id} mise à jour`,
      tool: "operator-action.update",
      output: { id: action.id },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("operator-action.update", err);
  }
}

export async function toggleActionDoneHandler(intent: ToggleIntent): Promise<HandlerResult> {
  try {
    const action = await toggleActionDone(intent.actionId, intent.done, intent);
    return {
      status: "OK",
      summary: `Action "${action.label}" marquée ${action.done ? "FAIT" : "PAS FAIT"}`,
      tool: "operator-action.toggle-done",
      output: { id: action.id, done: action.done },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("operator-action.toggle-done", err);
  }
}

export async function deleteOperatorActionHandler(intent: DeleteIntent): Promise<HandlerResult> {
  try {
    await deleteOperatorAction(intent.actionId, intent);
    return {
      status: "OK",
      summary: `Action ${intent.actionId} supprimée`,
      tool: "operator-action.delete",
      output: { id: intent.actionId },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("operator-action.delete", err);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Business helpers
// ─────────────────────────────────────────────────────────────────────

export interface OperatorActionScope { operatorId: string; strategyId?: string }
export interface CreateOperatorActionArgs extends OperatorActionScope {
  label: string;
  context: string | null;
  priority: "CRITIQUE" | "HAUTE" | "MOYENNE" | "BASSE";
  category: "BEFORE_DEPARTURE" | "SYSTEM" | "FOLLOWUPS" | "PRODUCTION" | "OTHER";
  source: "GMAIL" | "SLACK" | "WHATSAPP" | "VERBAL" | "BRIEF" | "SYSTEM" | "OTHER";
  campaignId: string | null;
  deliverableIds: string[];
  assigneeUserId: string | null;
  dueDate: Date | null;
}

type Transaction = Prisma.TransactionClient;
const ALLOWED_KEYS = ["label", "context", "priority", "category", "source", "campaignId", "deliverableIds", "assigneeUserId", "dueDate"];

/** Resource coherence after caller authorization; never an independent permission grant. */
async function checkActionLinks(tx: Transaction, args: Pick<OperatorAction, "campaignId" | "deliverableIds" | "assigneeUserId">, scope: OperatorActionScope) {
  if (scope.strategyId) {
    const strategy = await tx.strategy.findUnique({ where: { id: scope.strategyId },
      select: { operatorId: true, client: { select: { operatorId: true } } } });
    if (!strategy) throw new CampaignScopeError("NOT_FOUND", "Marque de contexte introuvable.");
    if ((strategy.operatorId ?? strategy.client?.operatorId) !== scope.operatorId) {
      throw new CampaignScopeError("FORBIDDEN", "La marque de contexte relève d’une autre équipe.");
    }
  }
  const campaignIds = new Set<string>();
  if (args.campaignId) campaignIds.add(args.campaignId);
  if (args.deliverableIds.length) {
    const tasks = await tx.campaignDeliverable.findMany({ where: { id: { in: args.deliverableIds } },
      select: { id: true, campaignId: true } });
    if (tasks.length !== new Set(args.deliverableIds).size) throw new CampaignScopeError("NOT_FOUND", "Une tâche liée est introuvable.");
    for (const task of tasks) campaignIds.add(task.campaignId);
  }
  for (const id of campaignIds) {
    const campaign = await tx.campaign.findUnique({ where: { id }, select: {
      strategy: { select: { operatorId: true, client: { select: { operatorId: true } } } },
    } });
    if (!campaign) throw new CampaignScopeError("NOT_FOUND", "Une campagne liée est introuvable.");
    if ((campaign.strategy.operatorId ?? campaign.strategy.client?.operatorId) !== scope.operatorId) {
      throw new CampaignScopeError("FORBIDDEN", "Une campagne ou tâche liée relève d’une autre équipe.");
    }
  }
  if (args.campaignId && [...campaignIds].some(id => id !== args.campaignId)) {
    throw new CampaignScopeError("BAD_REQUEST", "Les tâches doivent appartenir à la campagne liée ; retirez ce lien pour une action transverse.");
  }
  if (args.assigneeUserId) {
    const user = await tx.user.findUnique({ where: { id: args.assigneeUserId }, select: { operatorId: true } });
    if (!user) throw new CampaignScopeError("NOT_FOUND", "Responsable introuvable.");
    if (user.operatorId !== scope.operatorId) throw new CampaignScopeError("FORBIDDEN", "Le responsable relève d’une autre équipe.");
  }
}
function validLabel(value: string) {
  const label = value.trim();
  if (!label || label.length > 500) throw new CampaignScopeError("BAD_REQUEST", "Une action de 1 à 500 caractères est requise.");
  return label;
}
function validDate(value: string | Date | null) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (date && !Number.isFinite(date.getTime())) throw new CampaignScopeError("BAD_REQUEST", "L’échéance indiquée est invalide.");
  return date;
}
async function scopedAction(tx: Transaction, id: string, scope: OperatorActionScope) {
  await tx.$queryRaw`SELECT "id" FROM "OperatorAction" WHERE "id" = ${id} FOR UPDATE`;
  const row = await tx.operatorAction.findUnique({ where: { id } });
  if (!row) throw new CampaignScopeError("NOT_FOUND", "Action introuvable.");
  if (row.operatorId !== scope.operatorId) throw new CampaignScopeError("FORBIDDEN", "Cette action relève d’une autre équipe.");
  return row;
}

export async function createOperatorAction(args: CreateOperatorActionArgs): Promise<OperatorAction> {
  return db.$transaction(async tx => {
    await checkActionLinks(tx, args, args);
    return tx.operatorAction.create({ data: {
      operatorId: args.operatorId, label: validLabel(args.label), context: args.context,
      priority: args.priority, category: args.category, source: args.source,
      campaignId: args.campaignId, deliverableIds: args.deliverableIds,
      assigneeUserId: args.assigneeUserId, dueDate: validDate(args.dueDate), done: false,
    } });
  });
}

export async function updateOperatorAction(actionId: string, patches: UpdateIntent["patches"], scope: OperatorActionScope): Promise<OperatorAction> {
  return db.$transaction(async tx => {
    const row = await scopedAction(tx, actionId, scope);
    const data: Prisma.OperatorActionUpdateInput = {};
    for (const [key, value] of Object.entries(patches)) {
      if (!ALLOWED_KEYS.includes(key)) throw new CampaignScopeError("BAD_REQUEST", `Le champ « ${key} » n’est pas modifiable.`);
      if (value === undefined) continue;
      (data as Record<string, unknown>)[key] = key === "dueDate" ? validDate(value as string | null)
        : key === "label" ? validLabel(value as string) : value;
    }
    const effective = { ...row, ...Object.fromEntries(Object.entries(patches).filter(([, value]) => value !== undefined)) };
    await checkActionLinks(tx, effective, scope);
    return tx.operatorAction.update({ where: { id: actionId }, data });
  });
}

export async function toggleActionDone(actionId: string, done: boolean, scope: OperatorActionScope): Promise<OperatorAction> {
  return db.$transaction(async tx => {
    const row = await scopedAction(tx, actionId, scope);
    await checkActionLinks(tx, row, scope);
    if (row.done === done) return row;
    return tx.operatorAction.update({ where: { id: actionId }, data: { done, doneAt: done ? new Date() : null } });
  });
}

export async function deleteOperatorAction(actionId: string, scope: OperatorActionScope) {
  return db.$transaction(async tx => {
    const row = await scopedAction(tx, actionId, scope);
    // Historical incoherent links must not prevent an authorized cleanup of the action itself.
    await checkActionLinks(tx, { campaignId: null, deliverableIds: [], assigneeUserId: null }, scope);
    return tx.operatorAction.delete({ where: { id: row.id } });
  });
}

// ─────────────────────────────────────────────────────────────────────
// Read helpers
// ─────────────────────────────────────────────────────────────────────

export async function listActionsForOperator(args: {
  operatorId: string;
  done?: boolean;
  priority?: ("CRITIQUE" | "HAUTE" | "MOYENNE" | "BASSE")[];
  category?: ("BEFORE_DEPARTURE" | "SYSTEM" | "FOLLOWUPS" | "PRODUCTION" | "OTHER")[];
}): Promise<OperatorAction[]> {
  const where: Prisma.OperatorActionWhereInput = { operatorId: args.operatorId };
  if (args.done !== undefined) where.done = args.done;
  if (args.priority?.length) where.priority = { in: args.priority };
  if (args.category?.length) where.category = { in: args.category };
  return db.operatorAction.findMany({
    where,
    orderBy: [{ done: "asc" }, { priority: "asc" }, { dueDate: "asc" }],
  });
}
