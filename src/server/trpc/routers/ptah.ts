/**
 * Ptah tRPC router — Phase 9 (ADR-0009).
 *
 * Procédures :
 *   - materializeBrief : déclenche une forge (mutation)
 *   - getForge          : status d'un GenerativeTask
 *   - listForges        : liste des forges par strategy
 *   - getAssetVersion   : détail d'une version d'asset
 *   - listProviderHealth: état circuit breaker per-provider
 *
 * Toutes les mutations passent par `governedProcedure` qui appelle
 * `mestor.emitIntent()` automatiquement (Pilier 1 — pas de bypass).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, operatorProcedure, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { PILLAR_KEYS } from "@/domain/pillars";
import {
  materializeBrief,
  regenerateFadingAsset,
  resolveResumptionPayload,
} from "@/server/services/ptah";
import { emitIntentTyped, type Intent } from "@/server/services/mestor/intents";
import {
  FORGE_KINDS,
  MANIPULATION_MODES,
  PROVIDER_NAMES,
} from "@/server/services/ptah/types";
import { hasSubmissionClaim, providerParameters } from "@/server/services/ptah/resumption";
import { listProviders } from "@/server/services/ptah/routing/provider-selector";
import { getOperatorContext } from "@/server/services/operator-isolation";

/* lafusee:governed-active — Phase 0 migration complete v6.18.17 (Sprint 3) : 2 mutations (materializeBrief/regenerateFadingAsset) traversent mestor.emitIntent({ kind: "PTAH_*" }) via emitIntentTyped. Imports ptah.* sont pour Awaited<ReturnType<>> casts + queries (db direct). */

async function resolveOperatorId(userId: string, readStrategyId?: string) {
  const current = await getOperatorContext(userId);
  let operatorId = current.operatorId;
  // Only the selected-brand list passes this read scope. Submission and private
  // task lookup keep the user's actual assignment; never infer a default team.
  if (readStrategyId && current.role === "ADMIN") {
    const strategy = await db.strategy.findUnique({ where: { id: readStrategyId }, select: { operatorId: true } });
    if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Ce dossier n’existe plus." });
    if (!strategy.operatorId) throw new TRPCError({ code: "PRECONDITION_FAILED",
      message: "Ce dossier n’est affecté à aucune équipe de production. Faites vérifier son affectation." });
    operatorId = strategy.operatorId;
  }
  if (!operatorId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Votre compte n’est affecté à aucune équipe de production. Faites vérifier cette affectation." });
  }
  return { operatorId, canResume: current.operatorId === operatorId };
}

const ForgeSpecSchema = z.object({
  kind: z.enum(FORGE_KINDS as readonly [string, ...string[]]),
  providerHint: z.enum(PROVIDER_NAMES as readonly [string, ...string[]]).optional(),
  modelHint: z.string().optional(),
  parameters: z.record(z.string(), z.unknown()),
});

const ForgeBriefSchema = z.object({
  briefText: z.string().min(1),
  forgeSpec: ForgeSpecSchema,
  pillarSource: z.enum(PILLAR_KEYS as readonly [string, ...string[]]),
  manipulationMode: z.enum(MANIPULATION_MODES as readonly [string, ...string[]]),
});

export const ptahRouter = createTRPCRouter({
  // ── Mutations ───────────────────────────────────────────────────

  // Phase 0 migration v6.18.17 (Sprint 3) — emitIntentTyped wrapper.
  materializeBrief: operatorProcedure
    .input(
      z.union([z.object({ strategyId: z.string(), resumeTaskId: z.string().min(1) }).strict(), z.object({
        strategyId: z.string(),
        sourceIntentId: z.string(),
        campaignId: z.string().nullish(),
        briefId: z.string().nullish(),
        sourceBrandAssetId: z.string().nullish(),
        brief: ForgeBriefSchema,
        overrideMixViolation: z.boolean().optional(),
        // C6 (ADR-0103) — « forger quand même » : passe le VETO d'incohérence
        // brief↔ADVE sous C6_COHERENCE_MODE=block. Sans effet en mode WARN.
        coherenceOverride: z.boolean().optional(),
      }).strict()]),
    )
    .mutation(async ({ ctx, input }) => {
      const { operatorId } = await resolveOperatorId(ctx.session.user.id);
      const payload = "resumeTaskId" in input ? await (async () => {
        try { return (await resolveResumptionPayload(input.resumeTaskId, input.strategyId, operatorId)).payload; }
        catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED",
          message: error instanceof Error ? error.message : "Le brief conservé ne peut pas être vérifié." }); }
      })() : input;
      return emitIntentTyped<Awaited<ReturnType<typeof materializeBrief>>>(
        {
          kind: "PTAH_MATERIALIZE_BRIEF",
          strategyId: payload.strategyId,
          operatorId,
          resumeTaskId: "resumeTaskId" in payload ? payload.resumeTaskId : undefined,
          sourceIntentId: payload.sourceIntentId,
          campaignId: payload.campaignId,
          briefId: payload.briefId,
          sourceBrandAssetId: payload.sourceBrandAssetId,
          brief: payload.brief as Extract<Intent, { kind: "PTAH_MATERIALIZE_BRIEF" }>["brief"],
          overrideMixViolation: payload.overrideMixViolation,
          coherenceOverride: "coherenceOverride" in payload ? payload.coherenceOverride : undefined,
        },
        { caller: "ptah-router:materializeBrief" },
      );
    }),

  regenerateFadingAsset: operatorProcedure
    .input(
      z.object({
        strategyId: z.string(),
        assetVersionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { operatorId } = await resolveOperatorId(ctx.session.user.id);
      return emitIntentTyped<Awaited<ReturnType<typeof regenerateFadingAsset>>>(
        {
          kind: "PTAH_REGENERATE_FADING_ASSET",
          strategyId: input.strategyId,
          operatorId,
          assetVersionId: input.assetVersionId,
        },
        { caller: "ptah-router:regenerateFadingAsset" },
      );
    }),

  // ── Queries ─────────────────────────────────────────────────────

  getForge: operatorProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { operatorId } = await resolveOperatorId(ctx.session.user.id);
      const task = await db.generativeTask.findFirst({
        where: { id: input.taskId, operatorId },
        include: { versions: true },
      });
      return task;
    }),

  listForges: operatorProcedure
    .input(
      z.object({
        strategyId: z.string().optional(),
        forgeKind: z.enum(FORGE_KINDS as readonly [string, ...string[]]).optional(),
        status: z.enum(["CREATED", "IN_PROGRESS", "COMPLETED", "FAILED", "VETOED", "EXPIRED", "DEFERRED"]).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        cursor: z.object({ createdAt: z.date(), id: z.string() }).nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { operatorId, canResume } = await resolveOperatorId(ctx.session.user.id, input.strategyId);
      const tasks = await db.generativeTask.findMany({
        where: {
          operatorId,
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
          ...(input.forgeKind ? { forgeKind: input.forgeKind } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.cursor ? { OR: [{ createdAt: { lt: input.cursor.createdAt } },
            { createdAt: input.cursor.createdAt, id: { lt: input.cursor.id } }] } : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: input.limit,
        include: { versions: true },
      });
      const campaigns = await db.campaign.findMany({ where: { id: { in: tasks.flatMap(t => t.campaignId ? [t.campaignId] : []) },
        strategy: { operatorId }, ...(input.strategyId ? { strategyId: input.strategyId } : {}) }, select: { id: true, name: true } });
      const briefs = await db.campaignBrief.findMany({ where: { id: { in: tasks.flatMap(t => t.briefId ? [t.briefId] : []) },
        campaign: { strategy: { operatorId }, ...(input.strategyId ? { strategyId: input.strategyId } : {}) } }, select: { id: true, title: true } });
      return tasks.map(task => {
        // Webhook secrets and reservation metadata are not presentation data.
        const { webhookSecret: _secret, parameters: _parameters, ...publicTask } = task;
        return { ...publicTask, canResume, parameters: providerParameters(task),
          submissionUnknown: task.status === "CREATED" && !task.providerTaskId && hasSubmissionClaim(task),
          campaignTitle: campaigns.find(c => c.id === task.campaignId)?.name ?? null,
          briefTitle: briefs.find(b => b.id === task.briefId)?.title ?? null };
      });
    }),

  getAssetVersion: operatorProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { operatorId } = await resolveOperatorId(ctx.session.user.id);
      return db.assetVersion.findFirst({
        where: { id: input.id, operatorId },
        include: { generativeTask: true, parent: true, children: true },
      });
    }),

  listProviderHealth: protectedProcedure.query(async () => {
    const all = await db.forgeProviderHealth.findMany();
    const known = listProviders().map(async (p) => ({
      provider: p.name,
      available: await p.isAvailable(),
      externalDomains: p.externalDomains,
    }));
    return {
      health: all,
      knownProviders: await Promise.all(known),
    };
  }),
});
