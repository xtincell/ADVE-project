/**
 * Operator Action Router — Phase 18-A1-γ (audit MATANGA V4 ACTIONS).
 *
 * Manual-first parity (ADR-0060) : routes consommables depuis
 * `<OperatorActionForm />` UI standalone.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, operatorProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import {
  createOperatorAction,
  updateOperatorAction,
  toggleActionDone,
  deleteOperatorAction,
  listActionsForOperator,
} from "@/server/services/operator-action";
import { CampaignScopeError, getOperatorContext } from "@/server/services/operator-isolation";

/* lafusee:governed-active — Phase 18/19 router. Toutes les mutations utilisent governedProcedure (ADR-0004 strict cible atteinte) ; tag corrigé 2026-05-06 strangler→governed (faux positif initial — le router a toujours utilisé governedProcedure depuis sa création). */

const StringId = z.string().min(1);
const PriorityEnum = z.enum(["CRITIQUE", "HAUTE", "MOYENNE", "BASSE"]);
const CategoryEnum = z.enum(["BEFORE_DEPARTURE", "SYSTEM", "FOLLOWUPS", "PRODUCTION", "OTHER"]);
const SourceEnum = z.enum(["GMAIL", "SLACK", "WHATSAPP", "VERBAL", "BRIEF", "SYSTEM", "OTHER"]);

// Actions transverses : équipe réelle obligatoire, marque de contexte facultative.
// Caller authorization stays here; services bind action/campaign/task/assignee identities.
export const operatorActionRouter = createTRPCRouter({
  create: governedProcedure({
    kind: "OPERATOR_CREATE_ACTION",
    requireOperator: true,
    inputSchema: z.object({
      strategyId: StringId.optional(),
      operatorId: StringId,
      label: z.string().min(1).max(500),
      context: z.string().nullable().optional(),
      priority: PriorityEnum.optional(),
      category: CategoryEnum.optional(),
      source: SourceEnum.optional(),
      campaignId: StringId.nullable().optional(),
      deliverableIds: z.array(StringId).optional(),
      assigneeUserId: StringId.nullable().optional(),
      dueDate: z.string().nullable().optional(),
    }),
  }).mutation(async ({ input, ctx }) => {
    await assertCallerTeam(ctx.session.user.id, input.operatorId);
    try {
      const action = await createOperatorAction({
        strategyId: input.strategyId,
        operatorId: input.operatorId,
        label: input.label,
        context: input.context ?? null,
        priority: input.priority ?? "MOYENNE",
        category: input.category ?? "OTHER",
        source: input.source ?? "OTHER",
        campaignId: input.campaignId ?? null,
        deliverableIds: input.deliverableIds ?? [],
        assigneeUserId: input.assigneeUserId ?? null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      });
      return { ok: true as const, action };
    } catch (err) {
      throw new TRPCError({
        code: err instanceof CampaignScopeError ? err.code : "BAD_REQUEST",
        message: err instanceof Error ? err.message : "createOperatorAction failed",
      });
    }
  }),

  update: governedProcedure({
    kind: "OPERATOR_UPDATE_ACTION",
    requireOperator: true,
    inputSchema: z.object({
      strategyId: StringId.optional(),
      operatorId: StringId,
      actionId: StringId,
      patches: z.object({
        label: z.string().optional(),
        context: z.string().nullable().optional(),
        priority: PriorityEnum.optional(),
        category: CategoryEnum.optional(),
        source: SourceEnum.optional(),
        campaignId: StringId.nullable().optional(),
        deliverableIds: z.array(StringId).optional(),
        assigneeUserId: StringId.nullable().optional(),
        dueDate: z.string().nullable().optional(),
      }).passthrough(),
    }),
  }).mutation(async ({ input, ctx }) => {
    await assertCallerTeam(ctx.session.user.id, input.operatorId);
    try {
      const action = await updateOperatorAction(input.actionId, input.patches, input);
      return { ok: true as const, action };
    } catch (err) {
      throw new TRPCError({
        code: err instanceof CampaignScopeError ? err.code : "BAD_REQUEST",
        message: err instanceof Error ? err.message : "updateOperatorAction failed",
      });
    }
  }),

  toggleDone: governedProcedure({
    kind: "OPERATOR_TOGGLE_ACTION_DONE",
    requireOperator: true,
    inputSchema: z.object({
      strategyId: StringId.optional(),
      operatorId: StringId,
      actionId: StringId,
      done: z.boolean(),
    }),
  }).mutation(async ({ input, ctx }) => {
    await assertCallerTeam(ctx.session.user.id, input.operatorId);
    try {
      const action = await toggleActionDone(input.actionId, input.done, input);
      return { ok: true as const, action };
    } catch (err) {
      throw new TRPCError({
        code: err instanceof CampaignScopeError ? err.code : "BAD_REQUEST",
        message: err instanceof Error ? err.message : "toggleActionDone failed",
      });
    }
  }),

  delete: governedProcedure({
    kind: "OPERATOR_DELETE_ACTION",
    requireOperator: true,
    inputSchema: z.object({
      strategyId: StringId.optional(),
      operatorId: StringId,
      actionId: StringId,
    }),
  }).mutation(async ({ input, ctx }) => {
    await assertCallerTeam(ctx.session.user.id, input.operatorId);
    try {
      await deleteOperatorAction(input.actionId, input);
      return { ok: true as const, id: input.actionId };
    } catch (err) {
      throw new TRPCError({
        code: err instanceof CampaignScopeError ? err.code : "BAD_REQUEST",
        message: err instanceof Error ? err.message : "deleteOperatorAction failed",
      });
    }
  }),

  // Reads — STAFF only (énumérait les tâches de n'importe quel opérateur).
  listForOperator: operatorProcedure
    .input(
      z.object({
        operatorId: StringId,
        done: z.boolean().optional(),
        priority: z.array(PriorityEnum).optional(),
        category: z.array(CategoryEnum).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await assertCallerTeam(ctx.session.user.id, input.operatorId);
      return listActionsForOperator({
        operatorId: input.operatorId,
        done: input.done,
        priority: input.priority,
        category: input.category,
      });
    }),
});

async function assertCallerTeam(userId: string, operatorId: string) {
  const scope = await getOperatorContext(userId);
  if (scope.role !== "ADMIN" && scope.operatorId !== operatorId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette équipe." });
  }
}
