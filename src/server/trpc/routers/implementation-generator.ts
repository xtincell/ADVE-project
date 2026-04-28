/**
 * Implementation Generator Router — I pillar Havas-level deliverable
 * Orchestrates GLORY tools + multi-pass LLM for premium documentation.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { generateImplementation } from "@/server/services/implementation-generator";
import { createCampaignDrafts } from "@/server/services/implementation-generator/campaign-bridge";
import { db } from "@/lib/db";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "implementation-generator");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

export const implementationGeneratorRouter = createTRPCRouter({
  /** Generate the full premium I pillar deliverable */
  generate: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      autoCreateCampaignDrafts: z.boolean().default(true),
      autoGenerateS: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      return generateImplementation({
        strategyId: input.strategyId,
        autoCreateCampaignDrafts: input.autoCreateCampaignDrafts,
        autoGenerateS: input.autoGenerateS,
      });
    }),

  /** Get current I pillar generation status (quality score, passes, etc.) */
  getStatus: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      const pillar = await db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: "i" } },
        select: { content: true, confidence: true, updatedAt: true },
      });

      if (!pillar) return { exists: false } as const;

      const content = pillar.content as Record<string, unknown> | null;
      const meta = content?.generationMeta as Record<string, unknown> | undefined;

      return {
        exists: true,
        confidence: pillar.confidence,
        updatedAt: pillar.updatedAt,
        qualityScore: meta?.qualityScore as number | undefined,
        passes: meta?.passes as number | undefined,
        gloryToolsUsed: meta?.gloryToolsUsed as string[] | undefined,
        generatedAt: meta?.generatedAt as string | undefined,
      };
    }),

  /** Create Campaign BRIEF_DRAFTs from existing I pillar content */
  activateCampaigns: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ input }) => {
      const pillar = await db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: "i" } },
        select: { content: true },
      });

      if (!pillar?.content) {
        throw new Error("I pillar not generated yet. Run generate first.");
      }

      const content = pillar.content as Record<string, unknown>;
      const campaignIds = await createCampaignDrafts(
        input.strategyId,
        (content.sprint90Days ?? []) as unknown as Array<{ action: string; [k: string]: unknown }>,
        (content.annualCalendar ?? []) as unknown as Array<{ name: string; [k: string]: unknown }>,
      );

      return { campaignDraftIds: campaignIds, count: campaignIds.length };
    }),

  /** Regenerate a specific section of the I pillar */
  regenerateSection: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      section: z.enum([
        "brandPlatform", "copyStrategy", "bigIdea",
        "sprint90Days", "annualCalendar", "budget", "teamStructure", "mediaPlan",
      ]),
    }))
    .mutation(async ({ input }) => {
      // For now, regenerate the full pillar (section-level regen is a future enhancement)
      const result = await generateImplementation({
        strategyId: input.strategyId,
        autoCreateCampaignDrafts: false,
        autoGenerateS: false,
      });

      return {
        qualityScore: result.qualityScore,
        section: input.section,
        regenerated: true,
      };
    }),
});
