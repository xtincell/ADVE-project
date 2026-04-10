/**
 * Brief Ingest Router — NETERU-Governed
 *
 * Flow:
 *   1. preview  → Extract + LLM parse → ParsedBrief for operator review
 *   2. confirm  → Resolve brand → Hyperviseur builds & executes plan
 *   3. plan     → Get current orchestration plan status
 *   4. advance  → Resolve WAIT_HUMAN step → continue execution
 *   5. list     → History of ingested briefs
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { previewBrief, confirmIngest } from "@/server/services/brief-ingest";
import { parsedBriefSchema } from "@/server/services/brief-ingest/types";
import { executePlan, resolveHumanStep, persistPlan } from "@/server/services/mestor/hyperviseur";
import * as auditTrail from "@/server/services/audit-trail";

export const briefIngestRouter = createTRPCRouter({
  /**
   * Phase 1: Upload PDF/DOCX → extract + LLM parse → return ParsedBrief
   */
  preview: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileType: z.enum(["PDF", "DOCX", "TXT"]),
      content: z.string(),
    }))
    .mutation(async ({ input }) => {
      const result = await previewBrief(input.fileName, input.fileType, input.content);
      return {
        parsed: result.analysis.parsed,
        raw: result.analysis.raw,
        validationErrors: result.analysis.validationErrors,
        confidence: result.analysis.confidence,
        rawText: result.rawText,
      };
    }),

  /**
   * Phase 2: Confirm → resolve brand → Hyperviseur builds & runs plan
   * Returns the OrchestrationPlan (may have WAITING steps for operator)
   */
  confirm: protectedProcedure
    .input(z.object({
      parsed: parsedBriefSchema,
      newClientMode: z.enum(["FAST_TRACK", "ONBOARDING_FIRST"]).optional(),
      operatorNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;

      const result = await confirmIngest(input.parsed, operatorId, {
        newClientMode: input.newClientMode,
        operatorNotes: input.operatorNotes,
      });

      // Persist plan to DB
      await persistPlan(result.plan);

      // Audit trail
      auditTrail.log({
        userId: operatorId,
        action: "CREATE",
        entityType: "BriefIngest",
        entityId: result.strategyId,
        newValue: {
          clientId: result.clientId,
          strategyId: result.strategyId,
          phase: result.plan.phase,
          totalSteps: result.plan.steps.length,
          brandName: input.parsed.client.brandName,
          campaignName: input.parsed.campaignName,
          newClientMode: input.newClientMode,
        },
      }).catch((err) => {
        console.warn("[audit-trail] brief-ingest confirm log failed:", err instanceof Error ? err.message : err);
      });

      return {
        clientId: result.clientId,
        strategyId: result.strategyId,
        plan: {
          phase: result.plan.phase,
          steps: result.plan.steps.map(s => ({
            id: s.id,
            agent: s.agent,
            description: s.description,
            status: s.status,
            result: s.result,
            error: s.error,
          })),
          estimatedAiCalls: result.plan.estimatedAiCalls,
        },
      };
    }),

  /**
   * Advance plan — resolve a WAIT_HUMAN step and continue execution
   */
  advance: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      stepId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Load plan from DB
      const dbPlan = await ctx.db.orchestrationPlan.findFirst({
        where: { strategyId: input.strategyId, status: { in: ["RUNNING", "PAUSED"] } },
        include: { steps: true },
        orderBy: { createdAt: "desc" },
      });

      if (!dbPlan) throw new Error("No active plan found for this strategy");

      // Reconstruct OrchestrationPlan from DB
      const plan = {
        strategyId: dbPlan.strategyId,
        phase: dbPlan.phase as "QUICK_INTAKE" | "BOOT" | "ACTIVE" | "GROWTH",
        steps: dbPlan.steps.map(s => ({
          id: s.id,
          agent: s.agent as import("@/server/services/mestor/hyperviseur").StepAgent,
          target: s.target,
          description: s.description,
          priority: s.priority,
          dependsOn: (s.dependsOn as string[]) ?? [],
          status: s.status as "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED" | "WAITING",
          result: s.result as unknown,
          error: s.error ?? undefined,
          retryCount: 0,
          maxRetries: 1,
        })),
        pillarHealth: [],
        estimatedAiCalls: 0,
        createdAt: dbPlan.createdAt.toISOString(),
      };

      // Resolve the human step
      resolveHumanStep(plan, input.stepId);

      // Continue execution
      await executePlan(plan);

      // Persist updated plan
      await persistPlan(plan);

      return {
        steps: plan.steps.map(s => ({
          id: s.id,
          agent: s.agent,
          description: s.description,
          status: s.status,
          result: s.result,
          error: s.error,
        })),
      };
    }),

  /**
   * List previously ingested briefs
   */
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const briefs = await ctx.db.campaignBrief.findMany({
        where: { generatedBy: "brief-ingest-v1" },
        orderBy: { createdAt: "desc" },
        skip,
        take: input.limit,
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              state: true,
              strategy: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
              missions: { select: { id: true, title: true, status: true } },
            },
          },
        },
      });

      const total = await ctx.db.campaignBrief.count({
        where: { generatedBy: "brief-ingest-v1" },
      });

      return { briefs, total, page: input.page, totalPages: Math.ceil(total / input.limit) };
    }),
});
