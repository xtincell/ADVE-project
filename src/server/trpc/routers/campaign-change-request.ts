/**
 * Campaign Change Request Router — Phase 18-A1-β (audit MATANGA V4 TICKETS MODIFS).
 *
 * Manual-first parity (ADR-0060) : routes consommables depuis
 * `<CampaignChangeRequestForm />` UI standalone.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import {
  createChangeRequest,
  updateChangeRequest,
  resolveChangeRequest,
  escalateChangeRequest,
  listChangeRequestsForDeliverable,
  listOpenChangeRequestsForOperator,
} from "@/server/services/campaign-change-request";

const StringId = z.string().min(1);
const ImpactEnum = z.enum(["COSMETIC", "MINOR", "MAJOR", "OUT_OF_SCOPE"]);
const StatusEnum = z.enum(["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED", "ESCALATED"]);

export const campaignChangeRequestRouter = createTRPCRouter({
  create: governedProcedure({
    kind: "OPERATOR_CREATE_CHANGE_REQUEST",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      campaignDeliverableId: StringId,
      requestedByName: z.string().min(1).max(200),
      description: z.string().min(1).max(5000),
      impact: ImpactEnum,
      assignedToUserId: StringId.nullable().optional(),
    }),
  }).mutation(async ({ input }) => {
    try {
      const ticket = await createChangeRequest({
        campaignDeliverableId: input.campaignDeliverableId,
        requestedByName: input.requestedByName,
        description: input.description,
        impact: input.impact,
        assignedToUserId: input.assignedToUserId ?? null,
      });
      return { ok: true as const, ticket };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "createChangeRequest failed",
      });
    }
  }),

  update: governedProcedure({
    kind: "OPERATOR_UPDATE_CHANGE_REQUEST",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      ticketId: StringId,
      patches: z.object({
        status: StatusEnum.optional(),
        assignedToUserId: StringId.nullable().optional(),
        resolutionNotes: z.string().nullable().optional(),
        description: z.string().optional(),
        impact: ImpactEnum.optional(),
      }).passthrough(),
    }),
  }).mutation(async ({ input }) => {
    try {
      const ticket = await updateChangeRequest(input.ticketId, input.patches);
      return { ok: true as const, ticket };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "updateChangeRequest failed",
      });
    }
  }),

  resolve: governedProcedure({
    kind: "OPERATOR_RESOLVE_CHANGE_REQUEST",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      ticketId: StringId,
      resolutionNotes: z.string().min(1).max(2000),
      newBriefVersionId: StringId.nullable().optional(),
    }),
  }).mutation(async ({ input }) => {
    try {
      const ticket = await resolveChangeRequest(input.ticketId, input.resolutionNotes, input.newBriefVersionId ?? null);
      return { ok: true as const, ticket };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "resolveChangeRequest failed",
      });
    }
  }),

  escalate: governedProcedure({
    kind: "OPERATOR_ESCALATE_CHANGE_REQUEST",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      ticketId: StringId,
      escalationNotes: z.string().min(1).max(2000),
    }),
  }).mutation(async ({ input }) => {
    try {
      const ticket = await escalateChangeRequest(input.ticketId, input.escalationNotes);
      return { ok: true as const, ticket };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "escalateChangeRequest failed",
      });
    }
  }),

  // Reads
  listForDeliverable: protectedProcedure
    .input(z.object({ deliverableId: StringId }))
    .query(({ input }) => listChangeRequestsForDeliverable(input.deliverableId)),

  listOpenForOperator: protectedProcedure
    .input(z.object({ operatorId: StringId }))
    .query(({ input }) => listOpenChangeRequestsForOperator(input.operatorId)),
});
