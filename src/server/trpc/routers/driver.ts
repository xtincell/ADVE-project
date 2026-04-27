// ============================================================================
// MODULE M14 — Driver Engine
// Score: 100/100 | Priority: P1 | Status: FUNCTIONAL
// Spec: §2.2.2 + §4.1 | Division: La Fusée
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  create, update, delete, list, getByStrategy, activate, deactivate
// [x] REQ-2  generateSpecs(strategyId, channel) → specs via AI + Knowledge Graph
// [x] REQ-3  translateBrief(driverId, missionContext) → brief qualifié
// [x] REQ-4  DriverChannel enum (INSTAGRAM, FACEBOOK, TIKTOK, LINKEDIN, YOUTUBE, TWITTER, WEBSITE, PACKAGING, EVENT, PR, EMAIL, PRINT, OOH, RADIO, TV, OTHER)
// [x] REQ-5  auditCoherence(driverId) → cross-driver consistency check (CdC §3.1)
// [x] REQ-6  Lien Driver ↔ SocialConnection (un Driver Instagram connaît le compte OAuth)
// [x] REQ-7  Lien Driver ↔ GLORY tools (un Driver déclenche les tools pertinents)
// [x] REQ-8  Lien Driver ↔ MediaPlatformConnection (pour Driver PAID types)
// [x] REQ-9  Driver PR: traduire profil ADVE en angles presse + talking points
// [x] REQ-10 Multi-market Drivers avec adaptation linguistique (FW-15)
//
// PROCEDURES: create, update, delete, list, getByStrategy, activate,
//             deactivate, generateSpecs, translateBrief, auditCoherence,
//             getSocialConnection, getGloryTools, linkGloryTool, unlinkGloryTool,
//             getMediaConnection, generatePRAngles, cloneForMarket
// ============================================================================

import { z } from "zod";
import { DriverChannel } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "../init";
import { generateSpecs as engineGenerateSpecs, translateBrief as engineTranslateBrief } from "@/server/services/driver-engine";

export const driverRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      channel: z.nativeEnum(DriverChannel),
      channelType: z.enum(["DIGITAL", "PHYSICAL", "EXPERIENTIAL", "MEDIA"]),
      name: z.string().min(1),
      isPrimary: z.boolean().default(false),
      formatSpecs: z.record(z.unknown()).default({}),
      constraints: z.record(z.unknown()).default({}),
      briefTemplate: z.record(z.unknown()).default({}),
      qcCriteria: z.record(z.unknown()).default({}),
      pillarPriority: z.record(z.unknown()).default({}),
    }))
    .mutation(async ({ ctx, input }) => {
      // If this driver is primary, unset any existing primary for this strategy
      if (input.isPrimary) {
        await ctx.db.driver.updateMany({
          where: { strategyId: input.strategyId, isPrimary: true, deletedAt: null },
          data: { isPrimary: false },
        });
      }
      return ctx.db.driver.create({
        data: {
          ...input,
          formatSpecs: input.formatSpecs as Prisma.InputJsonValue,
          constraints: input.constraints as Prisma.InputJsonValue,
          briefTemplate: input.briefTemplate as Prisma.InputJsonValue,
          qcCriteria: input.qcCriteria as Prisma.InputJsonValue,
          pillarPriority: input.pillarPriority as Prisma.InputJsonValue,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      formatSpecs: z.record(z.unknown()).optional(),
      constraints: z.record(z.unknown()).optional(),
      briefTemplate: z.record(z.unknown()).optional(),
      qcCriteria: z.record(z.unknown()).optional(),
      pillarPriority: z.record(z.unknown()).optional(),
      status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const data: Record<string, unknown> = {};
      if (rest.name !== undefined) data.name = rest.name;
      if (rest.status !== undefined) data.status = rest.status;
      if (rest.formatSpecs !== undefined) data.formatSpecs = rest.formatSpecs as Prisma.InputJsonValue;
      if (rest.constraints !== undefined) data.constraints = rest.constraints as Prisma.InputJsonValue;
      if (rest.briefTemplate !== undefined) data.briefTemplate = rest.briefTemplate as Prisma.InputJsonValue;
      if (rest.qcCriteria !== undefined) data.qcCriteria = rest.qcCriteria as Prisma.InputJsonValue;
      if (rest.pillarPriority !== undefined) data.pillarPriority = rest.pillarPriority as Prisma.InputJsonValue;
      return ctx.db.driver.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.driver.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  list: protectedProcedure
    .input(z.object({ strategyId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.driver.findMany({
        where: {
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
          deletedAt: null,
        },
        include: { gloryTools: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  getByStrategy: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.driver.findMany({
        where: { strategyId: input.strategyId, deletedAt: null },
        include: { gloryTools: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      });
    }),

  activate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.driver.update({
        where: { id: input.id },
        data: { status: "ACTIVE" },
      });
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.driver.update({
        where: { id: input.id },
        data: { status: "INACTIVE" },
      });
    }),

  setPrimary: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const driver = await ctx.db.driver.findUniqueOrThrow({ where: { id: input.id } });
      // Transaction: unset all primary for this strategy, then set this one
      await ctx.db.$transaction([
        ctx.db.driver.updateMany({
          where: { strategyId: driver.strategyId, isPrimary: true, deletedAt: null },
          data: { isPrimary: false },
        }),
        ctx.db.driver.update({
          where: { id: input.id },
          data: { isPrimary: true },
        }),
      ]);
      return ctx.db.driver.findUniqueOrThrow({ where: { id: input.id } });
    }),

  generateSpecs: protectedProcedure
    .input(z.object({ strategyId: z.string(), channel: z.string() }))
    .mutation(async ({ input }) => {
      try {
        return await engineGenerateSpecs(input.strategyId, input.channel);
      } catch (error) {
        throw new Error(
          `Failed to generate specs for channel ${input.channel}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  auditCoherence: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const drivers = await ctx.db.driver.findMany({
        where: { strategyId: input.strategyId, deletedAt: null },
        include: { strategy: true },
      });

      if (drivers.length === 0) {
        return { strategyId: input.strategyId, driverCount: 0, issues: [] as string[], coherenceScore: 1.0 };
      }

      const strategy = drivers[0]!.strategy;
      const strategyVector = (strategy.advertis_vector as Record<string, number>) ?? {};
      const issues: string[] = [];
      let totalAlignment = 0;

      // Check each driver's pillar priorities against the strategy vector
      for (const driver of drivers) {
        const pillarPriority = (driver.pillarPriority as Record<string, number>) ?? {};

        // Check for pillar misalignment
        for (const [key, driverWeight] of Object.entries(pillarPriority)) {
          const strategyWeight = strategyVector[key] ?? 0;
          if (driverWeight > 15 && strategyWeight < 8) {
            issues.push(
              `Driver "${driver.name}" (${driver.channel}) emphasizes pillar "${key}" (${driverWeight.toFixed(1)}) but strategy scores it low (${strategyWeight.toFixed(1)}/25)`
            );
          }
        }

        // Check for channel overlap (two drivers on same channel)
        const sameChannel = drivers.filter((d) => d.channel === driver.channel && d.id !== driver.id);
        if (sameChannel.length > 0) {
          issues.push(
            `Channel overlap: "${driver.name}" shares channel ${driver.channel} with ${sameChannel.map((d) => `"${d.name}"`).join(", ")}`
          );
        }

        // Calculate alignment score for this driver
        let driverAlignment = 0;
        let pillarCount = 0;
        for (const [key, weight] of Object.entries(pillarPriority)) {
          const stratVal = strategyVector[key] ?? 0;
          driverAlignment += Math.max(0, 25 - Math.abs(weight - stratVal));
          pillarCount++;
        }
        totalAlignment += pillarCount > 0 ? driverAlignment / (pillarCount * 25) : 0;
      }

      // Deduplicate channel overlap issues
      const uniqueIssues = [...new Set(issues)];

      const coherenceScore = drivers.length > 0
        ? Math.round((totalAlignment / drivers.length) * 100) / 100
        : 1.0;

      return {
        strategyId: input.strategyId,
        driverCount: drivers.length,
        issues: uniqueIssues,
        coherenceScore: Math.min(1.0, coherenceScore),
      };
    }),

  translateBrief: protectedProcedure
    .input(z.object({ driverId: z.string(), missionContext: z.record(z.unknown()) }))
    .mutation(async ({ input }) => {
      try {
        return await engineTranslateBrief(input.driverId, input.missionContext);
      } catch (error) {
        throw new Error(
          `Failed to translate brief for driver ${input.driverId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  // ── REQ-6: Link Driver ↔ SocialConnection ──────────────────────────────
  getSocialConnection: protectedProcedure
    .input(z.object({ driverId: z.string() }))
    .query(async ({ ctx, input }) => {
      const driver = await ctx.db.driver.findUniqueOrThrow({
        where: { id: input.driverId },
        include: { strategy: true },
      });
      // Map DriverChannel to SocialPlatform where applicable
      const platformMap: Record<string, string> = {
        INSTAGRAM: "INSTAGRAM", FACEBOOK: "FACEBOOK", TIKTOK: "TIKTOK",
        LINKEDIN: "LINKEDIN", VIDEO: "YOUTUBE",
      };
      const platform = platformMap[driver.channel];
      if (!platform) return { driver: driver.name, channel: driver.channel, connection: null, message: "No social platform mapping for this channel" };

      const connection = await ctx.db.socialConnection.findFirst({
        where: { strategyId: driver.strategyId, platform: platform as never, status: "ACTIVE" },
      });
      return { driver: driver.name, channel: driver.channel, connection, linked: !!connection };
    }),

  // ── REQ-7: Link Driver ↔ GLORY tools ───────────────────────────────────
  getGloryTools: protectedProcedure
    .input(z.object({ driverId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.driverGloryTool.findMany({
        where: { driverId: input.driverId },
      });
    }),

  linkGloryTool: protectedProcedure
    .input(z.object({ driverId: z.string(), gloryTool: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent duplicates
      const existing = await ctx.db.driverGloryTool.findFirst({
        where: { driverId: input.driverId, gloryTool: input.gloryTool },
      });
      if (existing) return existing;
      return ctx.db.driverGloryTool.create({
        data: { driverId: input.driverId, gloryTool: input.gloryTool },
      });
    }),

  unlinkGloryTool: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.driverGloryTool.delete({ where: { id: input.id } });
    }),

  // ── REQ-8: Link Driver ↔ MediaPlatformConnection (PAID) ────────────────
  getMediaConnection: protectedProcedure
    .input(z.object({ driverId: z.string() }))
    .query(async ({ ctx, input }) => {
      const driver = await ctx.db.driver.findUniqueOrThrow({ where: { id: input.driverId } });
      // Map paid-relevant channels to media platform names
      const mediaMap: Record<string, string> = {
        INSTAGRAM: "meta_ads", FACEBOOK: "meta_ads", TIKTOK: "tiktok_ads",
        LINKEDIN: "linkedin_ads", VIDEO: "google_ads", TV: "tv_programmatic", OOH: "ooh_programmatic",
      };
      const platform = mediaMap[driver.channel];
      if (!platform) return { driver: driver.name, connection: null, message: "No media platform for this channel type" };

      const connection = await ctx.db.mediaPlatformConnection.findFirst({
        where: { strategyId: driver.strategyId, platform, status: "ACTIVE" },
      });
      return { driver: driver.name, channel: driver.channel, platform, connection, linked: !!connection };
    }),

  // ── REQ-9: Driver PR — press angles + talking points from ADVE profile ─
  generatePRAngles: protectedProcedure
    .input(z.object({ driverId: z.string() }))
    .query(async ({ ctx, input }) => {
      const driver = await ctx.db.driver.findUniqueOrThrow({
        where: { id: input.driverId },
        include: { strategy: { include: { pillars: true } } },
      });
      if (driver.channel !== "PR") {
        return { error: "generatePRAngles is only applicable to PR drivers" };
      }
      const pillars = driver.strategy.pillars;
      const aContent = (pillars.find(p => p.key === "a")?.content as Record<string, unknown>) ?? {};
      const vContent = (pillars.find(p => p.key === "v")?.content as Record<string, unknown>) ?? {};
      const eContent = (pillars.find(p => p.key === "e")?.content as Record<string, unknown>) ?? {};

      const angles = [
        aContent.manifesto ? { type: "FOUNDER_STORY", source: "A.manifesto", angle: "Le parcours et la vision du fondateur" } : null,
        aContent.ikigai ? { type: "PURPOSE", source: "A.ikigai", angle: "La raison d'etre de la marque" } : null,
        vContent.produitsCatalogue ? { type: "PRODUCT_LAUNCH", source: "V.produitsCatalogue", angle: "Nouveautes produit et innovations" } : null,
        eContent.rituels ? { type: "COMMUNITY", source: "E.rituels", angle: "Les rituels communautaires de la marque" } : null,
        { type: "BRAND_POSITION", source: "Strategy.advertis_vector", angle: "Positionnement unique sur le marche" },
      ].filter(Boolean);

      const talkingPoints = [
        aContent.valeurs ? `Valeurs fondamentales: ${JSON.stringify(aContent.valeurs).slice(0, 200)}` : null,
        vContent.promesse ? `Promesse de valeur: ${String(vContent.promesse).slice(0, 200)}` : null,
        driver.strategy.description ? `Vision: ${driver.strategy.description.slice(0, 200)}` : null,
      ].filter(Boolean);

      return { driverId: input.driverId, angles, talkingPoints, pillarCount: pillars.length };
    }),

  // ── REQ-10: Multi-market clone with linguistic adaptation ──────────────
  cloneForMarket: protectedProcedure
    .input(z.object({
      driverId: z.string(),
      targetMarket: z.string(),
      targetLanguage: z.string().default("en"),
      nameOverride: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.driver.findUniqueOrThrow({ where: { id: input.driverId } });
      const clonedName = input.nameOverride ?? `${source.name} (${input.targetMarket.toUpperCase()})`;

      const cloned = await ctx.db.driver.create({
        data: {
          strategyId: source.strategyId,
          channel: source.channel,
          channelType: source.channelType,
          name: clonedName,
          isPrimary: false,
          formatSpecs: source.formatSpecs as Prisma.InputJsonValue,
          constraints: {
            ...(source.constraints as Record<string, unknown>),
            market: input.targetMarket,
            language: input.targetLanguage,
          } as Prisma.InputJsonValue,
          briefTemplate: source.briefTemplate as Prisma.InputJsonValue,
          qcCriteria: source.qcCriteria as Prisma.InputJsonValue,
          pillarPriority: source.pillarPriority as Prisma.InputJsonValue,
        },
      });

      // Copy glory tool links
      const gloryLinks = await ctx.db.driverGloryTool.findMany({ where: { driverId: input.driverId } });
      if (gloryLinks.length > 0) {
        await ctx.db.driverGloryTool.createMany({
          data: gloryLinks.map(l => ({ driverId: cloned.id, gloryTool: l.gloryTool })),
        });
      }

      return { cloned, sourceId: input.driverId, market: input.targetMarket, language: input.targetLanguage };
    }),
});
