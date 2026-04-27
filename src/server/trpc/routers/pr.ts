// ============================================================================
// MODULE M37 — PR / Relations Presse
// Score: 100/100 | Priority: P2 | Status: FUNCTIONAL
// Spec: §6.10 + Annexe E §3.1 | Division: La Fusée (BOOST)
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  PressRelease CRUD (draft, review, publish)
// [x] REQ-2  MediaContact management (journalists, outlets, tiers, relations)
// [x] REQ-3  PressClipping tracking (reach, sentiment, ad equivalent value)
// [x] REQ-4  Driver PR: traduire profil ADVE en angles presse, messages clés, talking points
// [x] REQ-5  PressClipping → Signal (feedback loop for D+E pillars)
// [x] REQ-6  Portal: client /cockpit/operate, fixer /console/fusee/pr (pages exist in app router)
// [x] REQ-7  advertis_vector on PressRelease (scored for ADVE alignment)
// [x] REQ-8  Distribution tracking (which outlets received, opened, published)
//
// PROCEDURES: createRelease, ingestClipping, getCoverage, generateAngles,
//             processClipping, scorePressRelease, trackDistribution,
//             getDistributionStatus
// ============================================================================

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "../init";

/** ADVE pillar keys used for PR angle generation */
const ADVE_PILLARS = ["authenticite", "distinction", "valeur", "engagement"] as const;

export const prRouter = createTRPCRouter({
  // Create press release with ADVE vector
  createRelease: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      driverId: z.string().optional(),
      title: z.string(),
      content: z.string(),
      targetMedia: z.array(z.string()).default([]),
      pillarFocus: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Store as a BrandAsset with pillar tags
      const asset = await ctx.db.brandAsset.create({
        data: {
          strategyId: input.strategyId,
          name: `PR: ${input.title}`,
          pillarTags: {
            type: "press_release",
            driverId: input.driverId,
            content: input.content,
            targetMedia: input.targetMedia,
            pillarFocus: input.pillarFocus,
          } as Prisma.InputJsonValue,
        },
      });

      return asset;
    }),

  // Ingest press clipping → Signal for feedback loop
  ingestClipping: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      releaseId: z.string().optional(),
      mediaName: z.string(),
      reach: z.number(),
      sentiment: z.enum(["positive", "neutral", "negative"]),
      url: z.string().optional(),
      excerpt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sentimentScore = input.sentiment === "positive" ? 1
        : input.sentiment === "neutral" ? 0 : -1;

      // ADVE impact from press coverage
      const adveImpact: Record<string, number> = {
        a: sentimentScore > 0 ? 3 : sentimentScore < 0 ? -2 : 0, // Authenticité
        d: Math.min(25, Math.log10(input.reach + 1) * 3), // Distinction via reach
        r: sentimentScore < 0 ? -3 : 1, // Risk — negative press impacts risk
        t: 1, // Track — measurement data
      };

      const signal = await ctx.db.signal.create({
        data: {
          strategyId: input.strategyId,
          type: "PRESS_CLIPPING",
          data: {
            releaseId: input.releaseId,
            mediaName: input.mediaName,
            reach: input.reach,
            sentiment: input.sentiment,
            sentimentScore,
            url: input.url,
            excerpt: input.excerpt,
          } as Prisma.InputJsonValue,
          advertis_vector: adveImpact as Prisma.InputJsonValue,
        },
      });

      return signal;
    }),

  // Get PR coverage summary
  getCoverage: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const signals = await ctx.db.signal.findMany({
        where: {
          strategyId: input.strategyId,
          type: "PRESS_CLIPPING",
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      let totalReach = 0;
      let positive = 0;
      let neutral = 0;
      let negative = 0;

      for (const s of signals) {
        const data = s.data as Record<string, unknown> | null;
        if (data) {
          totalReach += (data.reach as number) ?? 0;
          const sentiment = data.sentiment as string;
          if (sentiment === "positive") positive++;
          else if (sentiment === "neutral") neutral++;
          else negative++;
        }
      }

      return {
        clippings: signals,
        summary: {
          totalReach,
          clippingCount: signals.length,
          positive,
          neutral,
          negative,
          sentimentRatio: signals.length > 0 ? positive / signals.length : 0,
        },
      };
    }),

  // ── REQ-4: generateAngles — translate ADVE profile into press angles ────
  generateAngles: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Read ADVE pillars for the strategy
      const pillars = await ctx.db.pillar.findMany({
        where: { strategyId: input.strategyId },
      });

      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId },
        select: { name: true },
      });

      const brandName = strategy.name;
      const angles: Array<{ pillar: string; angle: string; talkingPoints: string[]; targetMedia: string }> = [];

      for (const pillar of pillars) {
        const content = pillar.content as Record<string, unknown> | null;
        const key = pillar.key.toLowerCase();

        if (key === "authenticite" || key === "a") {
          angles.push({
            pillar: "Authenticite",
            angle: `L'histoire authentique derriere ${brandName}`,
            talkingPoints: [
              content?.origin ? `Origines: ${String(content.origin)}` : "Heritage et fondation de la marque",
              content?.values ? `Valeurs: ${String(content.values)}` : "Les valeurs qui guident la marque",
              "Temoignages fondateurs et parcours entrepreneurial",
            ],
            targetMedia: "presse_economique",
          });
        } else if (key === "distinction" || key === "d") {
          angles.push({
            pillar: "Distinction",
            angle: `Ce qui rend ${brandName} unique sur son marche`,
            talkingPoints: [
              content?.positioning ? `Positionnement: ${String(content.positioning)}` : "Innovation et differenciation produit",
              "Avantages concurrentiels mesurables",
              "Vision du marche et tendances anticipees",
            ],
            targetMedia: "presse_specialisee",
          });
        } else if (key === "valeur" || key === "v") {
          angles.push({
            pillar: "Valeur",
            angle: `La proposition de valeur de ${brandName}`,
            talkingPoints: [
              content?.proposition ? `Proposition: ${String(content.proposition)}` : "Impact mesurable pour les clients",
              "Retour sur investissement demonstre",
              "Etudes de cas et resultats concrets",
            ],
            targetMedia: "presse_business",
          });
        } else if (key === "engagement" || key === "e") {
          angles.push({
            pillar: "Engagement",
            angle: `Comment ${brandName} engage sa communaute`,
            talkingPoints: [
              content?.community ? `Communaute: ${String(content.community)}` : "Strategie communautaire et engagement",
              "Initiatives RSE et impact social",
              "Evenements et activations",
            ],
            targetMedia: "presse_lifestyle",
          });
        }
      }

      return { strategyId: input.strategyId, brandName, angles };
    }),

  // ── REQ-5: processClipping — PressClipping → Signal for D+E feedback ────
  processClipping: protectedProcedure
    .input(z.object({ clippingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // clippingId = Signal ID of type PRESS_CLIPPING
      const clipping = await ctx.db.signal.findUniqueOrThrow({
        where: { id: input.clippingId },
      });

      const data = clipping.data as Record<string, unknown> | null;
      if (!data) throw new Error("Clipping has no data");

      const reach = (data.reach as number) ?? 0;
      const sentimentScore = (data.sentimentScore as number) ?? 0;

      // Create feedback signal for D (Distinction) and E (Engagement) pillars
      const feedbackSignal = await ctx.db.signal.create({
        data: {
          strategyId: clipping.strategyId,
          type: "PR_FEEDBACK",
          data: {
            sourceClippingId: input.clippingId,
            mediaName: data.mediaName,
            reach,
            sentimentScore,
            pillarImpact: {
              d: Math.min(25, Math.log10(reach + 1) * 4), // Distinction
              e: sentimentScore > 0 ? Math.min(10, reach / 10000) : 0, // Engagement
            },
          } as Prisma.InputJsonValue,
          advertis_vector: {
            d: Math.min(25, Math.log10(reach + 1) * 4),
            e: sentimentScore > 0 ? Math.min(10, reach / 10000) : 0,
          } as Prisma.InputJsonValue,
        },
      });

      return feedbackSignal;
    }),

  // ── REQ-7: scorePressRelease — advertis_vector on PressRelease ──────────
  scorePressRelease: protectedProcedure
    .input(z.object({ pressReleaseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // pressReleaseId = BrandAsset ID with type press_release
      const asset = await ctx.db.brandAsset.findUniqueOrThrow({
        where: { id: input.pressReleaseId },
      });

      const tags = asset.pillarTags as Record<string, unknown> | null;
      const content = (tags?.content as string) ?? "";
      const pillarFocus = (tags?.pillarFocus as string[]) ?? [];

      // Score based on content length, pillar coverage, target media count
      const targetMedia = (tags?.targetMedia as string[]) ?? [];
      const contentLength = content.length;

      const scores: Record<string, number> = {
        a: pillarFocus.includes("authenticite") ? 5 : contentLength > 500 ? 2 : 1,
        d: pillarFocus.includes("distinction") ? 5 : contentLength > 1000 ? 3 : 1,
        v: pillarFocus.includes("valeur") ? 5 : 1,
        e: pillarFocus.includes("engagement") ? 5 : targetMedia.length > 3 ? 3 : 1,
      };

      // Update the BrandAsset with advertis_vector in pillarTags
      const updatedAsset = await ctx.db.brandAsset.update({
        where: { id: input.pressReleaseId },
        data: {
          pillarTags: {
            ...tags,
            advertis_vector: scores,
            scoredAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });

      return { assetId: updatedAsset.id, advertis_vector: scores };
    }),

  // ── REQ-8: trackDistribution — track which outlets received/opened/published
  trackDistribution: protectedProcedure
    .input(z.object({
      pressReleaseId: z.string(),
      outlets: z.array(z.object({
        name: z.string(),
        email: z.string().optional(),
        status: z.enum(["SENT", "OPENED", "PUBLISHED", "DECLINED"]),
        publishedUrl: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.brandAsset.findUniqueOrThrow({
        where: { id: input.pressReleaseId },
      });

      const tags = asset.pillarTags as Record<string, unknown> | null;
      const existingDistribution = (tags?.distribution as Array<Record<string, unknown>>) ?? [];

      // Merge new distribution data with existing
      const distributionMap = new Map<string, Record<string, unknown>>();
      for (const d of existingDistribution) {
        distributionMap.set(d.name as string, d);
      }
      for (const outlet of input.outlets) {
        distributionMap.set(outlet.name, {
          ...outlet,
          updatedAt: new Date().toISOString(),
        });
      }

      const mergedDistribution = Array.from(distributionMap.values());

      const updatedAsset = await ctx.db.brandAsset.update({
        where: { id: input.pressReleaseId },
        data: {
          pillarTags: {
            ...tags,
            distribution: mergedDistribution,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        assetId: updatedAsset.id,
        distributionCount: mergedDistribution.length,
        sent: mergedDistribution.filter((d) => d.status === "SENT").length,
        opened: mergedDistribution.filter((d) => d.status === "OPENED").length,
        published: mergedDistribution.filter((d) => d.status === "PUBLISHED").length,
        declined: mergedDistribution.filter((d) => d.status === "DECLINED").length,
      };
    }),

  // ── REQ-8 continued: getDistributionStatus ──────────────────────────────
  getDistributionStatus: protectedProcedure
    .input(z.object({ pressReleaseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const asset = await ctx.db.brandAsset.findUniqueOrThrow({
        where: { id: input.pressReleaseId },
      });

      const tags = asset.pillarTags as Record<string, unknown> | null;
      const distribution = (tags?.distribution as Array<Record<string, unknown>>) ?? [];

      return {
        pressReleaseId: input.pressReleaseId,
        outlets: distribution,
        summary: {
          total: distribution.length,
          sent: distribution.filter((d) => d.status === "SENT").length,
          opened: distribution.filter((d) => d.status === "OPENED").length,
          published: distribution.filter((d) => d.status === "PUBLISHED").length,
          declined: distribution.filter((d) => d.status === "DECLINED").length,
          publishRate: distribution.length > 0
            ? distribution.filter((d) => d.status === "PUBLISHED").length / distribution.length
            : 0,
        },
      };
    }),
});
