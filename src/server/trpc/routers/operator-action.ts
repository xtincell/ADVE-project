/**
 * Operator Action Router — Phase 18-A1-γ (audit MATANGA V4 ACTIONS).
 *
 * Manual-first parity (ADR-0060) : routes consommables depuis
 * `<OperatorActionForm />` UI standalone.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import {
  createOperatorAction,
  updateOperatorAction,
  toggleActionDone,
  listActionsForOperator,
} from "@/server/services/operator-action";
import { db } from "@/lib/db";

const StringId = z.string().min(1);
const PriorityEnum = z.enum(["CRITIQUE", "HAUTE", "MOYENNE", "BASSE"]);
const CategoryEnum = z.enum(["BEFORE_DEPARTURE", "SYSTEM", "FOLLOWUPS", "PRODUCTION", "OTHER"]);
const SourceEnum = z.enum(["GMAIL", "SLACK", "WHATSAPP", "VERBAL", "BRIEF", "SYSTEM", "OTHER"]);

export const operatorActionRouter = createTRPCRouter({
  create: governedProcedure({
    kind: "OPERATOR_CREATE_ACTION",
    inputSchema: z.object({
      strategyId: StringId,
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
  }).mutation(async ({ input }) => {
    try {
      const action = await createOperatorAction({
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
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "createOperatorAction failed",
      });
    }
  }),

  update: governedProcedure({
    kind: "OPERATOR_UPDATE_ACTION",
    inputSchema: z.object({
      strategyId: StringId,
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
  }).mutation(async ({ input }) => {
    try {
      const action = await updateOperatorAction(input.actionId, input.patches);
      return { ok: true as const, action };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "updateOperatorAction failed",
      });
    }
  }),

  toggleDone: governedProcedure({
    kind: "OPERATOR_TOGGLE_ACTION_DONE",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      actionId: StringId,
      done: z.boolean(),
    }),
  }).mutation(async ({ input }) => {
    try {
      const action = await toggleActionDone(input.actionId, input.done);
      return { ok: true as const, action };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "toggleActionDone failed",
      });
    }
  }),

  delete: governedProcedure({
    kind: "OPERATOR_DELETE_ACTION",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      actionId: StringId,
    }),
  }).mutation(async ({ input }) => {
    try {
      await db.operatorAction.delete({ where: { id: input.actionId } });
      return { ok: true as const, id: input.actionId };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "deleteOperatorAction failed",
      });
    }
  }),

  // Reads
  listForOperator: protectedProcedure
    .input(
      z.object({
        operatorId: StringId,
        done: z.boolean().optional(),
        priority: z.array(PriorityEnum).optional(),
        category: z.array(CategoryEnum).optional(),
      }),
    )
    .query(({ input }) =>
      listActionsForOperator({
        operatorId: input.operatorId,
        done: input.done,
        priority: input.priority,
        category: input.category,
      }),
    ),
});
