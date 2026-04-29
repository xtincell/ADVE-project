/**
 * Strategy Presentation — tRPC Router
 * Endpoints for assembling, sharing, and checking completeness of strategic proposals.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";
import {
  assemblePresentation,
  getShareToken,
  resolveShareToken,
  checkCompleteness,
} from "@/server/services/strategy-presentation";
import { generateBudgetPlan } from "@/server/services/budget-allocator";
import { enrichAllSections, enrichAllSectionsNeteru } from "@/server/services/strategy-presentation/enrich-oracle";
import { auditedProcedure, governedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "strategy-presentation");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

export const strategyPresentationRouter = createTRPCRouter({
  /** Assemble the full 13-section document for a strategy (authenticated) */
  assemble: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return assemblePresentation(input.strategyId);
    }),

  /** Generate or retrieve the shareable link for a strategy */
  shareLink: protectedProcedure
    .input(
      z.object({
        strategyId: z.string(),
        persona: z.enum(["consultant", "client", "creative"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { token, url } = await getShareToken(input.strategyId);
      const fullUrl = input.persona ? `${url}?persona=${input.persona}` : url;
      return { token, url: fullUrl, sharedAt: new Date().toISOString() };
    }),

  /** Resolve a public share token to the assembled document (no auth required) */
  resolveToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const strategyId = await resolveShareToken(input.token);
      if (!strategyId) return null;
      return assemblePresentation(strategyId);
    }),

  /** Check which sections have sufficient data */
  completeness: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return checkCompleteness(input.strategyId);
    }),

  /** Enrich ALL empty/partial Oracle sections by filling pillar gaps via LLM */
  enrichOracle: governedProcedure({
    kind: "ENRICH_ORACLE",
    inputSchema: z.object({ strategyId: z.string() }),
    preconditions: ["ORACLE_ENRICH"],
  }).mutation(async ({ input }) => {
    return enrichAllSections(input.strategyId);
  }),

  /** NETERU v2: Enrich Oracle via the full trio (Seshat→Mestor→Artemis) */
  enrichOracleNeteru: governedProcedure({
    kind: "ENRICH_ORACLE",
    inputSchema: z.object({ strategyId: z.string() }),
    preconditions: ["ORACLE_ENRICH"],
  }).mutation(async ({ input }) => {
    return enrichAllSectionsNeteru(input.strategyId);
  }),

  /** Generate deterministic budget plan from raw budget amount */
  budgetPlan: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      budget: z.number().min(0).optional(),
    }))
    .query(async ({ input }) => {
      return generateBudgetPlan(input.strategyId, input.budget);
    }),
});
