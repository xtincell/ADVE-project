/**
 * OperatorAction service handlers (Phase 18-A1-γ, audit MATANGA V4 ACTIONS).
 */

import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import type { OperatorAction, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type HandlerResult = Pick<IntentResult, "status" | "summary" | "tool" | "output" | "reason" | "estimatedCost">;
type CreateIntent = Extract<Intent, { kind: "OPERATOR_CREATE_ACTION" }>;
type UpdateIntent = Extract<Intent, { kind: "OPERATOR_UPDATE_ACTION" }>;
type ToggleIntent = Extract<Intent, { kind: "OPERATOR_TOGGLE_ACTION_DONE" }>;
type DeleteIntent = Extract<Intent, { kind: "OPERATOR_DELETE_ACTION" }>;

const ZERO_COST = { amount: 0, currency: "USD" } as const;

function vetoed(tool: string, msg: string): HandlerResult {
  return {
    status: "VETOED",
    summary: msg,
    tool,
    reason: msg.includes("not found") ? "NOT_FOUND" : "VALIDATION_FAILED",
    estimatedCost: ZERO_COST,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Intent handlers
// ─────────────────────────────────────────────────────────────────────

export async function createOperatorActionHandler(intent: CreateIntent): Promise<HandlerResult> {
  try {
    const action = await createOperatorAction({
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
    return vetoed("operator-action.create", err instanceof Error ? err.message : String(err));
  }
}

export async function updateOperatorActionHandler(intent: UpdateIntent): Promise<HandlerResult> {
  try {
    const action = await updateOperatorAction(intent.actionId, intent.patches);
    return {
      status: "OK",
      summary: `Action ${action.id} mise à jour`,
      tool: "operator-action.update",
      output: { id: action.id },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("operator-action.update", err instanceof Error ? err.message : String(err));
  }
}

export async function toggleActionDoneHandler(intent: ToggleIntent): Promise<HandlerResult> {
  try {
    const action = await toggleActionDone(intent.actionId, intent.done);
    return {
      status: "OK",
      summary: `Action "${action.label}" marquée ${action.done ? "FAIT" : "PAS FAIT"}`,
      tool: "operator-action.toggle-done",
      output: { id: action.id, done: action.done },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("operator-action.toggle-done", err instanceof Error ? err.message : String(err));
  }
}

export async function deleteOperatorActionHandler(intent: DeleteIntent): Promise<HandlerResult> {
  try {
    await db.operatorAction.delete({ where: { id: intent.actionId } });
    return {
      status: "OK",
      summary: `Action ${intent.actionId} supprimée`,
      tool: "operator-action.delete",
      output: { id: intent.actionId },
      estimatedCost: ZERO_COST,
    };
  } catch (err) {
    return vetoed("operator-action.delete", err instanceof Error ? err.message : String(err));
  }
}

// ─────────────────────────────────────────────────────────────────────
// Business helpers
// ─────────────────────────────────────────────────────────────────────

export interface CreateOperatorActionArgs {
  operatorId: string;
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

export async function createOperatorAction(args: CreateOperatorActionArgs): Promise<OperatorAction> {
  return db.operatorAction.create({
    data: {
      operatorId: args.operatorId,
      label: args.label,
      context: args.context,
      priority: args.priority,
      category: args.category,
      source: args.source,
      campaignId: args.campaignId,
      deliverableIds: args.deliverableIds,
      assigneeUserId: args.assigneeUserId,
      dueDate: args.dueDate,
      done: false,
    },
  });
}

export async function updateOperatorAction(
  actionId: string,
  patches: UpdateIntent["patches"],
): Promise<OperatorAction> {
  const existing = await db.operatorAction.findUnique({ where: { id: actionId } });
  if (!existing) throw new Error(`OperatorAction ${actionId} not found`);

  const allowedKeys = ["label", "context", "priority", "category", "source", "campaignId", "deliverableIds", "assigneeUserId", "dueDate"];
  const data: Prisma.OperatorActionUpdateInput = {};
  for (const [key, value] of Object.entries(patches)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`Field "${key}" non modifiable. Allowed: ${allowedKeys.join(", ")}`);
    }
    if (key === "dueDate" && typeof value === "string") {
      (data as Record<string, unknown>)[key] = new Date(value);
    } else {
      (data as Record<string, unknown>)[key] = value;
    }
  }
  return db.operatorAction.update({ where: { id: actionId }, data });
}

export async function toggleActionDone(actionId: string, done: boolean): Promise<OperatorAction> {
  const existing = await db.operatorAction.findUnique({ where: { id: actionId } });
  if (!existing) throw new Error(`OperatorAction ${actionId} not found`);
  return db.operatorAction.update({
    where: { id: actionId },
    data: {
      done,
      doneAt: done ? new Date() : null,
    },
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
