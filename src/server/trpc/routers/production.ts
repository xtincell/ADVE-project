/**
 * Production — tRPC router (ADR-0111, Phase 24). Acteur Production.
 *
 * Fan-out de specs de livrable (catalogue seedé) + droits d'usage avec gate
 * d'expiration. Lectures tenant-scopées par la campagne de l'exécution ;
 * mutations gouvernées (`emitIntent`). Zéro LLM.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { canAccessCampaign } from "@/server/services/operator-isolation";
import * as prod from "@/server/services/production";
/* lafusee:governed-active */

type Ctx = { session: { user: { id: string; role: string; operatorId?: string | null } } };

async function assertCampaignAccess(ctx: Ctx, campaignId: string) {
  const ok = await canAccessCampaign(campaignId, {
    operatorId: ctx.session.user.operatorId ?? null,
    userId: ctx.session.user.id,
    role: ctx.session.user.role ?? "USER",
  });
  if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette campagne." });
}

export const productionRouter = createTRPCRouter({
  /** Catalogue canaux × specs seedé. */
  channelSpecs: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.channelSpecReference.findMany({ orderBy: [{ channel: "asc" }, { label: "asc" }] });
  }),

  /** Taxonomie AICP A→X seedée (sections de devis). */
  aicpSections: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.aicpSectionReference.findMany({ orderBy: { sortOrder: "asc" } });
  }),

  /** Devis AICP d'une exécution : lignes + rollup section + totaux (déterministe). */
  aicpDevis: protectedProcedure
    .input(z.object({ executionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const exec = await ctx.db.campaignExecution.findUniqueOrThrow({ where: { id: input.executionId }, select: { campaignId: true } });
      await assertCampaignAccess(ctx, exec.campaignId);
      return prod.getAicpDevis(input.executionId);
    }),

  /** Specs de livrable d'une exécution. */
  deliverables: protectedProcedure
    .input(z.object({ executionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const exec = await ctx.db.campaignExecution.findUniqueOrThrow({ where: { id: input.executionId }, select: { campaignId: true } });
      await assertCampaignAccess(ctx, exec.campaignId);
      return ctx.db.deliverableSpec.findMany({ where: { executionId: input.executionId }, include: { usageGrants: true } });
    }),

  /** Gate de diffusion d'un livrable (droits d'usage non expirés). */
  diffusionStatus: protectedProcedure
    .input(z.object({ deliverableSpecId: z.string() }))
    .query(async ({ ctx, input }) => {
      const spec = await ctx.db.deliverableSpec.findUniqueOrThrow({
        where: { id: input.deliverableSpecId },
        select: { execution: { select: { campaignId: true } } },
      });
      await assertCampaignAccess(ctx, spec.execution.campaignId);
      return prod.checkDiffusionAllowed(input.deliverableSpecId);
    }),

  /** Éclate une exécution en specs de livrable depuis le catalogue. */
  fanOut: governedProcedure({
    kind: "LEGACY_DELIVERABLE_FANOUT",
    inputSchema: z.object({ executionId: z.string(), channelSpecKeys: z.array(z.string()).min(1) }),
    caller: "production:fanOut",
  }).mutation(async ({ ctx, input }) => {
    const exec = await ctx.db.campaignExecution.findUniqueOrThrow({ where: { id: input.executionId }, select: { campaignId: true } });
    await assertCampaignAccess(ctx, exec.campaignId);
    return prod.fanOutDeliverables(input);
  }),

  /** Crée un droit d'usage (talent × livrable) avec expiration calculée. */
  createUsageGrant: governedProcedure({
    kind: "LEGACY_USAGE_GRANT_CREATE",
    inputSchema: z.object({
      deliverableSpecId: z.string(),
      talentProfileId: z.string().optional(),
      media: z.array(z.string()).min(1),
      territory: z.string().min(1).max(60),
      termStart: z.date(),
      termMonths: z.number().int().positive(),
      buyoutFee: z.number().nonnegative().optional(),
      currency: z.string().max(8).optional(),
      exclusivity: z.boolean().optional(),
    }),
    caller: "production:createUsageGrant",
  }).mutation(async ({ ctx, input }) => {
    const spec = await ctx.db.deliverableSpec.findUniqueOrThrow({
      where: { id: input.deliverableSpecId },
      select: { execution: { select: { campaignId: true } } },
    });
    await assertCampaignAccess(ctx, spec.execution.campaignId);
    return prod.createUsageGrant(input);
  }),

  /** Ajoute une ligne de devis AICP (prévue). */
  addAicpLine: governedProcedure({
    kind: "LEGACY_AICP_ADD_LINE",
    inputSchema: z.object({
      executionId: z.string(),
      sectionCode: z.string().min(1).max(4),
      description: z.string().min(1).max(500),
      plannedAmount: z.number().nonnegative(),
      currency: z.string().max(8).optional(),
    }),
    caller: "production:addAicpLine",
  }).mutation(async ({ ctx, input }) => {
    const exec = await ctx.db.campaignExecution.findUniqueOrThrow({ where: { id: input.executionId }, select: { campaignId: true } });
    await assertCampaignAccess(ctx, exec.campaignId);
    return prod.addAicpLine(input);
  }),

  /** Enregistre le réalisé d'une ligne AICP (→ variance). */
  recordAicpActual: governedProcedure({
    kind: "LEGACY_AICP_RECORD_ACTUAL",
    inputSchema: z.object({ lineId: z.string(), actualAmount: z.number().nonnegative() }),
    caller: "production:recordAicpActual",
  }).mutation(async ({ ctx, input }) => {
    const line = await ctx.db.aicpLineItem.findUniqueOrThrow({
      where: { id: input.lineId },
      select: { execution: { select: { campaignId: true } } },
    });
    await assertCampaignAccess(ctx, line.execution.campaignId);
    return prod.recordAicpActual(input);
  }),
});
