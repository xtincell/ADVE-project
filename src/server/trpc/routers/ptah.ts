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
} from "@/server/services/ptah";
import {
  FORGE_KINDS,
  MANIPULATION_MODES,
  PROVIDER_NAMES,
} from "@/server/services/ptah/types";
import { listProviders } from "@/server/services/ptah/routing/provider-selector";

async function resolveOperatorId(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { operatorId: true },
  });
  if (!user?.operatorId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "User has no operatorId" });
  }
  return user.operatorId;
}

const ForgeSpecSchema = z.object({
  kind: z.enum(FORGE_KINDS as readonly [string, ...string[]]),
  providerHint: z.enum(PROVIDER_NAMES as readonly [string, ...string[]]).optional(),
  modelHint: z.string().optional(),
  parameters: z.record(z.unknown()),
});

const ForgeBriefSchema = z.object({
  briefText: z.string().min(1),
  forgeSpec: ForgeSpecSchema,
  pillarSource: z.enum(PILLAR_KEYS as readonly [string, ...string[]]),
  manipulationMode: z.enum(MANIPULATION_MODES as readonly [string, ...string[]]),
});

export const ptahRouter = createTRPCRouter({
  // ── Mutations ───────────────────────────────────────────────────

  materializeBrief: operatorProcedure
    .input(
      z.object({
        strategyId: z.string(),
        sourceIntentId: z.string(),
        brief: ForgeBriefSchema,
        overrideMixViolation: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      const intentId = `intent-ptah-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return materializeBrief(input as never, {
        operatorId,
        intentId,
      });
    }),

  regenerateFadingAsset: operatorProcedure
    .input(
      z.object({
        strategyId: z.string(),
        assetVersionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      const intentId = `intent-ptah-regen-${Date.now()}`;
      return regenerateFadingAsset(input, {
        operatorId,
        intentId,
      });
    }),

  // ── Queries ─────────────────────────────────────────────────────

  getForge: operatorProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
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
        status: z.enum(["CREATED", "IN_PROGRESS", "COMPLETED", "FAILED", "VETOED", "EXPIRED"]).optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return db.generativeTask.findMany({
        where: {
          operatorId,
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
          ...(input.forgeKind ? { forgeKind: input.forgeKind } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        include: { versions: true },
      });
    }),

  getAssetVersion: operatorProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
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
