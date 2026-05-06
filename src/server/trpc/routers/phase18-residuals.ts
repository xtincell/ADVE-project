/**
 * Phase 18 résidus — Router tRPC pour le formulaire opérateur de session future.
 *
 * `/console/governance/phase-18-residuals` permet de remplir progressivement les
 * paliers reportés (N5-bis Bible reclassif, N6-bis Glory tools annotation,
 * N9 duplicate-pillars, N10 feature flag, LLM fine-tune, Cache Redis,
 * Phase 18-bis M&A). Chaque entrée crée un audit trail persistant.
 *
 * Manual-first parity (ADR-0053) : c'est par définition manuel — le formulaire
 * EST le mode de saisie principal.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { db } from "@/lib/db";

const StringId = z.string().min(1);
const CategoryEnum = z.enum([
  "BIBLE_VAR",
  "GLORY_TOOL",
  "PILLAR_DUPLICATE",
  "FEATURE_FLAG",
  "LLM_TUNING",
  "PHASE_18_BIS",
  "CACHE_INFRA",
]);
const StatusEnum = z.enum(["PENDING", "IN_PROGRESS", "RESOLVED", "DISMISSED"]);

export const phase18ResidualsRouter = createTRPCRouter({
  /**
   * Crée ou upsert une entrée résidu. Idempotent par (operatorId, category, targetKey).
   */
  upsert: protectedProcedure
    .input(
      z.object({
        operatorId: StringId,
        category: CategoryEnum,
        targetKey: z.string().min(1).max(120),
        payload: z.unknown(),
        notes: z.string().nullable().optional(),
        status: StatusEnum.optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const entry = await db.phase18ResidualEntry.upsert({
          where: {
            operatorId_category_targetKey: {
              operatorId: input.operatorId,
              category: input.category,
              targetKey: input.targetKey,
            },
          },
          create: {
            operatorId: input.operatorId,
            category: input.category,
            targetKey: input.targetKey,
            payload: input.payload as never,
            notes: input.notes ?? null,
            status: input.status ?? "PENDING",
          },
          update: {
            payload: input.payload as never,
            notes: input.notes ?? null,
            status: input.status ?? undefined,
          },
        });
        return { ok: true as const, entry };
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "upsert phase18Residual failed",
        });
      }
    }),

  /** Marque une entrée comme RESOLVED + stamp resolvedAt + resolvedBy. */
  resolve: protectedProcedure
    .input(
      z.object({
        entryId: StringId,
        resolvedBy: StringId,
        resolutionNotes: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const entry = await db.phase18ResidualEntry.update({
          where: { id: input.entryId },
          data: {
            status: "RESOLVED",
            resolvedAt: new Date(),
            resolvedBy: input.resolvedBy,
            notes: input.resolutionNotes,
          },
        });
        return { ok: true as const, entry };
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "resolve phase18Residual failed",
        });
      }
    }),

  /** Marque DISMISSED (= n'a pas besoin de résolution, opérateur a tranché). */
  dismiss: protectedProcedure
    .input(z.object({ entryId: StringId, reason: z.string().min(1).max(500) }))
    .mutation(async ({ input }) => {
      try {
        const entry = await db.phase18ResidualEntry.update({
          where: { id: input.entryId },
          data: { status: "DISMISSED", notes: input.reason },
        });
        return { ok: true as const, entry };
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "dismiss phase18Residual failed",
        });
      }
    }),

  /** Liste les entrées d'un operator filtrées par category / status. */
  list: protectedProcedure
    .input(
      z.object({
        operatorId: StringId,
        category: CategoryEnum.optional(),
        status: StatusEnum.optional(),
      }),
    )
    .query(({ input }) =>
      db.phase18ResidualEntry.findMany({
        where: {
          operatorId: input.operatorId,
          ...(input.category ? { category: input.category } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        orderBy: [{ category: "asc" }, { createdAt: "desc" }],
      }),
    ),

  /** Stats agrégées par category × status pour dashboard governance. */
  stats: protectedProcedure
    .input(z.object({ operatorId: StringId }))
    .query(async ({ input }) => {
      const all = await db.phase18ResidualEntry.findMany({
        where: { operatorId: input.operatorId },
        select: { category: true, status: true },
      });
      const byCategory: Record<string, Record<string, number>> = {};
      for (const e of all) {
        byCategory[e.category] ??= { PENDING: 0, IN_PROGRESS: 0, RESOLVED: 0, DISMISSED: 0 };
        byCategory[e.category]![e.status] = (byCategory[e.category]![e.status] ?? 0) + 1;
      }
      return { total: all.length, byCategory };
    }),
});
