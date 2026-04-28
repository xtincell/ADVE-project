/**
 * Sequence Vault — tRPC Router
 * Staging vault for sequence outputs + skill tree visualization.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  listExecutions,
  acceptExecution,
  rejectExecution,
  deleteExecution,
  getAcceptedExecution,
  buildSkillTree,
  checkPrerequisites,
  type SequencePrerequisite,
} from "@/server/services/sequence-vault";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "sequence-vault");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

export const sequenceVaultRouter = createTRPCRouter({
  /** List all sequence executions for a strategy */
  list: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      approval: z.enum(["PENDING", "ACCEPTED", "REJECTED"]).optional(),
      sequenceKey: z.string().optional(),
      currentOnly: z.boolean().default(true),
    }))
    .query(async ({ input }) => {
      return listExecutions(input.strategyId, {
        approval: input.approval,
        sequenceKey: input.sequenceKey,
        currentOnly: input.currentOnly,
      });
    }),

  /** Accept a sequence execution → promote to BrandAsset */
  accept: protectedProcedure
    .input(z.object({
      executionId: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return acceptExecution(input.executionId, ctx.session.user.id, input.notes);
    }),

  /** Reject a sequence execution */
  reject: protectedProcedure
    .input(z.object({
      executionId: z.string(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return rejectExecution(input.executionId, ctx.session.user.id, input.reason);
    }),

  /** Delete a non-accepted execution */
  delete: protectedProcedure
    .input(z.object({ executionId: z.string() }))
    .mutation(async ({ input }) => {
      return deleteExecution(input.executionId);
    }),

  /** Get the accepted execution for a specific sequence */
  getAccepted: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      sequenceKey: z.string(),
    }))
    .query(async ({ input }) => {
      return getAcceptedExecution(input.strategyId, input.sequenceKey);
    }),

  /** Get the full skill tree (all sequences with lock status) */
  skillTree: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return buildSkillTree(input.strategyId);
    }),

  /** Check prerequisites for a specific sequence */
  checkPrereqs: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      requires: z.array(z.object({
        type: z.enum(["SEQUENCE", "SEQUENCE_ANY", "PILLAR"]),
        key: z.string().optional(),
        tier: z.number().optional(),
        count: z.number().optional(),
        status: z.literal("ACCEPTED").optional(),
        maturity: z.string().optional(),
      })),
    }))
    .query(async ({ input }) => {
      return checkPrerequisites(
        input.strategyId,
        input.requires as SequencePrerequisite[],
      );
    }),
});
