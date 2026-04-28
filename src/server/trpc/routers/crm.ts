/**
 * CRM Router — Deals, funnel tracking, intake conversion, notes, activities,
 * revenue forecasting, conversion metrics.
 *
 * CdC: Annexe E §4.2 — Pipeline commercial (Quick Intake -> Deal -> Brand Instance)
 * Phase 0: Quick Intake complete -> Deal auto, pipeline visible, revenue forecasting
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import * as crm from "@/server/services/crm-engine";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "crm");
const _auditedAdmin = auditedProcedure(adminProcedure, "crm");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

// ============================================================================
// DEAL LIFECYCLE
// ============================================================================

export const crmRouter = createTRPCRouter({
  /**
   * Create a deal from a completed Quick Intake (auto-triggered on intake complete,
   * but also callable manually for missed conversions)
   */
  createDealFromIntake: protectedProcedure
    .input(z.object({ intakeId: z.string() }))
    .mutation(({ input }) => crm.createDealFromIntake(input.intakeId)),

  /**
   * Create a manual deal (direct prospect, referral, event, etc.)
   */
  createDeal: protectedProcedure
    .input(z.object({
      contactName: z.string().min(1),
      contactEmail: z.string().email(),
      companyName: z.string().min(1),
      value: z.number().optional(),
      currency: z.string().default("XAF"),
      source: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => crm.createDeal(input)),

  /**
   * Update deal fields (contact info, value, notes)
   */
  updateDeal: protectedProcedure
    .input(z.object({
      dealId: z.string(),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      companyName: z.string().optional(),
      value: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { dealId, ...data } = input;
      return crm.updateDeal(dealId, data);
    }),

  /**
   * Advance a deal to the next pipeline stage
   */
  advanceDeal: protectedProcedure
    .input(z.object({ dealId: z.string(), notes: z.string().optional() }))
    .mutation(({ input }) => crm.advanceDeal(input.dealId, input.notes)),

  /**
   * Move deal to a specific stage (jump forward or backward)
   */
  moveDealToStage: protectedProcedure
    .input(z.object({
      dealId: z.string(),
      stage: z.enum(["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => crm.moveDealToStage(input.dealId, input.stage, input.notes)),

  /**
   * Mark deal as lost with reason
   */
  loseDeal: protectedProcedure
    .input(z.object({ dealId: z.string(), reason: z.string() }))
    .mutation(({ input }) => crm.loseDeal(input.dealId, input.reason)),

  /**
   * Convert a WON deal into a Strategy (Brand Instance)
   */
  convertToStrategy: adminProcedure
    .input(z.object({
      dealId: z.string(),
      userId: z.string(),
      operatorId: z.string().optional(),
    }))
    .mutation(({ input }) => crm.convertDealToStrategy(input.dealId, input.userId, input.operatorId)),

  // ============================================================================
  // NOTES & ACTIVITIES (CRMNote, CRMActivity — Prisma models)
  // ============================================================================

  /**
   * Add a note to a deal
   */
  addNote: protectedProcedure
    .input(z.object({
      dealId: z.string(),
      content: z.string().min(1),
      noteType: z.enum(["GENERAL", "CALL", "MEETING", "EMAIL", "FOLLOWUP"]).default("GENERAL"),
    }))
    .mutation(({ ctx, input }) =>
      crm.addNote(input.dealId, ctx.session.user.id, input.content, input.noteType)
    ),

  /**
   * List notes for a deal
   */
  listNotes: protectedProcedure
    .input(z.object({ dealId: z.string() }))
    .query(({ input }) => crm.listNotes(input.dealId)),

  /**
   * Log an activity on a deal (call, meeting, email, task, etc.)
   */
  addActivity: protectedProcedure
    .input(z.object({
      dealId: z.string(),
      activityType: z.enum(["CALL", "MEETING", "EMAIL", "TASK", "FOLLOWUP", "DEMO", "OTHER"]),
      description: z.string().min(1),
    }))
    .mutation(({ ctx, input }) =>
      crm.addActivity(input.dealId, input.activityType, input.description, ctx.session.user.id)
    ),

  /**
   * List activities for a deal (timeline)
   */
  listActivities: protectedProcedure
    .input(z.object({ dealId: z.string() }))
    .query(({ input }) => crm.listActivities(input.dealId)),

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Get full deal details (notes, activities, funnel history, weighted value)
   */
  getDealDetails: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => crm.getDealDetails(input.id)),

  /**
   * Get single deal (lightweight)
   */
  getDeal: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.deal.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          strategy: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }),

  /**
   * List all deals with optional stage filter
   */
  listDeals: protectedProcedure
    .input(z.object({
      stage: z.enum(["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]).optional(),
      limit: z.number().min(1).max(500).default(200),
    }))
    .query(({ input }) => crm.listDeals({ stage: input.stage, limit: input.limit })),

  /**
   * Get pipeline overview (Kanban data — counts + values per stage + deal list)
   */
  getPipeline: protectedProcedure.query(() => crm.getPipelineOverview()),

  // ============================================================================
  // FORECASTING & METRICS (CdC Annexe E §4.2)
  // ============================================================================

  /**
   * Revenue forecast: weighted pipeline, win rate, average deal size, close time
   */
  getRevenueForecast: protectedProcedure.query(() => crm.getRevenueForecast()),

  /**
   * Conversion metrics: stage durations, conversion rates, bottleneck detection
   */
  getConversionMetrics: protectedProcedure.query(() => crm.getConversionMetrics()),
});
