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
import { runDiagnosticBatch, getFrameworksByLayer } from "@/server/services/artemis";

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

  /** Run Artemis frameworks to enrich empty Oracle sections */
  enrichOracle: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ input }) => {
      // Check which sections are incomplete
      const completenessReport = await checkCompleteness(input.strategyId);
      const emptySections = Object.entries(completenessReport)
        .filter(([, status]) => status === "empty")
        .map(([id]) => id);

      if (emptySections.length === 0) {
        return { enriched: 0, message: "Toutes les sections sont deja completes." };
      }

      // Map empty sections to Artemis layers
      const sectionToLayer: Record<string, string> = {
        "proposition-valeur": "VALUE",
        "experience-engagement": "EXPERIENCE",
        "swot-interne": "SURVIVAL",
        "swot-externe": "VALIDATION",
        "signaux-opportunites": "VALIDATION",
        "catalogue-actions": "EXECUTION",
        "fenetre-overton": "GROWTH",
        "profil-superfan": "EXPERIENCE",
        "croissance-evolution": "GROWTH",
      };

      const layersToRun = new Set<string>();
      for (const section of emptySections) {
        const layer = sectionToLayer[section];
        if (layer) layersToRun.add(layer);
      }

      // Run Artemis frameworks for each needed layer
      const allSlugs: string[] = [];
      for (const layer of layersToRun) {
        const frameworks = getFrameworksByLayer(layer as Parameters<typeof getFrameworksByLayer>[0]);
        allSlugs.push(...frameworks.map((f) => f.slug));
      }

      if (allSlugs.length === 0) {
        return { enriched: 0, message: "Aucun framework Artemis applicable aux sections vides." };
      }

      const results = await runDiagnosticBatch(input.strategyId, allSlugs, {});
      const completed = results.filter((r) => r.status === "COMPLETED").length;

      return {
        enriched: completed,
        total: allSlugs.length,
        layers: [...layersToRun],
        emptySections,
        message: `${completed}/${allSlugs.length} frameworks Artemis executes pour enrichir L'Oracle.`,
      };
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
