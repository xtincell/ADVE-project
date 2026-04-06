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

  /** Run Artemis + LLM to enrich empty Oracle sections by filling pillar gaps */
  enrichOracle: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const completenessReport = await checkCompleteness(input.strategyId);
      const emptySections = Object.entries(completenessReport)
        .filter(([, status]) => status === "empty")
        .map(([id]) => id);

      if (emptySections.length === 0) {
        return { enriched: 0, message: "Toutes les sections sont deja completes." };
      }

      // Map empty sections → which pillar fields to generate
      const sectionToPillarEnrichment: Record<string, { pillar: string; fields: string[] }> = {
        "proposition-valeur": { pillar: "v", fields: ["pricing", "pricingStrategy", "pricingLadder", "proofPoints", "guarantees", "innovationPipeline", "unitEconomics"] },
        "swot-externe": { pillar: "t", fields: ["concurrents", "tendances", "brandMarketFit", "validation"] },
        "signaux-opportunites": { pillar: "t", fields: ["weakSignals", "opportunities"] },
        "profil-superfan": { pillar: "e", fields: ["superfanPortrait", "devotionJourney", "idealCustomer"] },
        "croissance-evolution": { pillar: "s", fields: ["growthLoops", "expansion", "evolution", "innovationPipeline"] },
      };

      const enriched: string[] = [];

      // Also run Artemis frameworks in parallel
      const layersToRun = new Set<string>();
      const sectionToLayer: Record<string, string> = {
        "proposition-valeur": "VALUE",
        "experience-engagement": "EXPERIENCE",
        "swot-externe": "VALIDATION",
        "profil-superfan": "EXPERIENCE",
        "croissance-evolution": "GROWTH",
      };
      for (const section of emptySections) {
        if (sectionToLayer[section]) layersToRun.add(sectionToLayer[section]!);
      }

      // Run Artemis in background (non-blocking)
      if (layersToRun.size > 0) {
        const allSlugs: string[] = [];
        for (const layer of layersToRun) {
          const frameworks = getFrameworksByLayer(layer as Parameters<typeof getFrameworksByLayer>[0]);
          allSlugs.push(...frameworks.map((f) => f.slug));
        }
        runDiagnosticBatch(input.strategyId, allSlugs, {}).catch(() => {});
      }

      // Direct pillar enrichment via LLM for each empty section
      for (const section of emptySections) {
        const enrichment = sectionToPillarEnrichment[section];
        if (!enrichment) continue;

        const pillar = await ctx.db.pillar.findUnique({
          where: { strategyId_key: { strategyId: input.strategyId, key: enrichment.pillar } },
        });
        if (!pillar) continue;

        const currentContent = (pillar.content ?? {}) as Record<string, unknown>;
        const missingFields = enrichment.fields.filter((f) => !currentContent[f]);
        if (missingFields.length === 0) continue;

        try {
          const { generateText } = await import("ai");
          const { anthropic } = await import("@ai-sdk/anthropic");

          const { text } = await generateText({
            model: anthropic("claude-sonnet-4-20250514"),
            system: `Tu enrichis le pilier ${enrichment.pillar.toUpperCase()} d'une strategie de marque.
Produis UNIQUEMENT un JSON avec les champs demandes. Pas de texte autour.`,
            prompt: `Contexte pilier actuel:\n${JSON.stringify(currentContent, null, 2)}\n\nGenere ces champs manquants en JSON: ${missingFields.join(", ")}`,
            maxTokens: 2048,
          });

          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const generated = JSON.parse(match[0]);
            await ctx.db.pillar.update({
              where: { id: pillar.id },
              data: { content: { ...currentContent, ...generated } as never },
            });
            enriched.push(section);
          }
        } catch (err) {
          console.warn(`[enrichOracle] Failed to enrich ${section}:`, err instanceof Error ? err.message : err);
        }
      }

      return {
        enriched: enriched.length,
        total: emptySections.length,
        sections: enriched,
        emptySections,
        message: enriched.length > 0
          ? `${enriched.length}/${emptySections.length} sections enrichies via Artemis + LLM.`
          : "Artemis en cours — rechargez dans quelques secondes pour voir les resultats.",
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
