/**
 * Actions — tRPC router for the canonical I-pillar action database (ADR-0094).
 *
 * `BrandAction` is the homogeneous, queryable projection of the I-pillar
 * initiatives (materialized from the blob by `syncBrandActionsFromBlob`). The
 * cockpit I surface + the Oracle action sections read THIS, not the raw blob —
 * killing the "heterogeneous actions" problem and the fabricated defaults.
 *
 * Reads are pure queries. `sync` is a deterministic read-projection rebuild
 * (idempotent, no semantic mutation — analogous to thot.calc being read-only);
 * the underlying business mutations (add/select initiatives) flow through the
 * blob via the ADR-0088 function-calling Recommendation payloads, then this
 * projection is re-synced. So no governance bypass.
 */

/* lafusee:governed-active — the only direct service import is the deterministic
   BrandAction materializer, an idempotent read-projection rebuild (no semantic
   mutation). Business mutations stay on the blob via ADR-0088 reco payloads. */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import { syncBrandActionsFromBlob } from "@/server/services/artemis/action-db/materializer";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";

const filters = z.object({
  strategyId: z.string().min(1),
  touchpoint: z.string().optional(),
  status: z.string().optional(),
  selected: z.boolean().optional(),
});

/**
 * ADR-0129 — garde par-marque du calendrier éditorial (BrandAction).
 * Ces procédures étaient `protectedProcedure` sans AUCUN contrôle d'ownership
 * (trou pré-existant) ; désormais chaque lecture/écriture vérifie l'accès à la
 * Strategy via le point de passage canonique (owner / opérateur / ADMIN /
 * collaborateur délégué ACTIVE — ex. directeur du digital).
 */
async function assertCalendarAccess(userId: string, strategyId: string): Promise<void> {
  const opCtx = await getOperatorContext(userId);
  if (!(await canAccessStrategy(strategyId, opCtx))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
  }
}

export const actionsRouter = createTRPCRouter({
  /** Flat, homogeneous list of the strategy's actions (optionally filtered). */
  byStrategy: protectedProcedure.input(filters).query(async ({ ctx, input }) => {
    await assertCalendarAccess(ctx.session.user.id, input.strategyId);
    return ctx.db.brandAction.findMany({
      where: {
        strategyId: input.strategyId,
        ...(input.touchpoint ? { touchpoint: input.touchpoint } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.selected !== undefined ? { selected: input.selected } : {}),
      },
      orderBy: [{ selected: "desc" }, { priority: "asc" }, { createdAt: "asc" }],
    });
  }),

  /** Aggregate counts for dashboard chips — honest emptiness when no rows. */
  summary: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertCalendarAccess(ctx.session.user.id, input.strategyId);
      const rows = await ctx.db.brandAction.findMany({
        where: { strategyId: input.strategyId },
        select: { touchpoint: true, status: true, selected: true, budgetMin: true, costTemplateKey: true },
      });
      const byTouchpoint: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      let selectedCount = 0;
      let withCost = 0;
      let totalSelectedBudget = 0;
      for (const r of rows) {
        const tp = r.touchpoint ?? "UNCLASSIFIED";
        byTouchpoint[tp] = (byTouchpoint[tp] ?? 0) + 1;
        byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
        if (r.selected) {
          selectedCount++;
          totalSelectedBudget += r.budgetMin ?? 0;
        }
        if (r.costTemplateKey) withCost++;
      }
      return {
        total: rows.length,
        byTouchpoint,
        byStatus,
        selectedCount,
        withCostTemplate: withCost,
        totalSelectedBudget,
      };
    }),

  /**
   * Rebuild the projection from the I-pillar blob. Idempotent; preserves
   * operator-authored rows. Operator-triggered refresh (the cascade also calls
   * the materializer automatically after GENERATE_I_ACTIONS).
   */
  sync: operatorProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return syncBrandActionsFromBlob(input.strategyId);
    }),

  /**
   * Propose additive actions (Phase 24) — generate-more (LLM, brand-aware) or
   * manual entry. Governed via mestor.emitIntent (PROPOSE_BRAND_ACTIONS). Rows
   * land status=PROPOSED; the operator then selects them for the roadmap.
   */
  propose: protectedProcedure
    .input(
      z.object({
        strategyId: z.string().min(1),
        mode: z.enum(["LLM", "MANUAL"]),
        channel: z.string().max(40).optional(),
        count: z.number().int().min(1).max(12).optional(),
        briefIntention: z.string().max(2000).optional(),
        budgetMax: z.number().positive().optional(),
        via: z.enum(["BRIEF", "GENERATE_MORE", "MANUAL"]).optional(),
        manualActions: z
          .array(
            z.object({
              title: z.string().min(1).max(200),
              channel: z.string().max(40).optional(),
              description: z.string().max(400).optional(),
              budget: z.number().nonnegative().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCalendarAccess(ctx.session.user.id, input.strategyId);
      const { emitIntent } = await import("@/server/services/mestor/intents");
      const result = await emitIntent(
        { kind: "PROPOSE_BRAND_ACTIONS", ...input, operatorId: ctx.session?.user?.id ?? undefined },
        { caller: "actions.propose" },
      );
      return (
        (result.output as { status: string; mode: string; created: number; reason?: string } | undefined) ?? {
          status: result.status,
          mode: input.mode,
          created: 0,
        }
      );
    }),

  /** Operator/founder selects (or unselects) an action for the S roadmap. */
  setSelected: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1), actionId: z.string().min(1), selected: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await assertCalendarAccess(ctx.session.user.id, input.strategyId);
      const updated = await ctx.db.brandAction.updateMany({
        where: { id: input.actionId, strategyId: input.strategyId },
        data: { selected: input.selected, status: input.selected ? "ACCEPTED" : "PROPOSED" },
      });
      return { updated: updated.count };
    }),

  /**
   * Operator adjusts a single action's scheduled window (roadmap calendar).
   * Projection-level operational scheduling — same tier as `setSelected` (no
   * pillar/semantic mutation). `timingStart=null` un-schedules (back to ACCEPTED).
   */
  setTiming: protectedProcedure
    .input(
      z.object({
        strategyId: z.string().min(1),
        actionId: z.string().min(1),
        timingStart: z.string().datetime().nullable(),
        timingEnd: z.string().datetime().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCalendarAccess(ctx.session.user.id, input.strategyId);
      const updated = await ctx.db.brandAction.updateMany({
        where: { id: input.actionId, strategyId: input.strategyId },
        data: {
          timingStart: input.timingStart ? new Date(input.timingStart) : null,
          ...(input.timingEnd !== undefined ? { timingEnd: input.timingEnd ? new Date(input.timingEnd) : null } : {}),
          status: input.timingStart ? "SCHEDULED" : "ACCEPTED",
        },
      });
      return { updated: updated.count };
    }),

  /**
   * Auto-schedule the retained (selected) actions across a horizon — deterministic
   * spread by priority then creation order, one every `cadenceDays` from `startDate`
   * (defaults: today, 14-day cadence). Zero LLM. The operator then adjusts any date
   * via `setTiming` ("auto + ajustable"). `onlyUnscheduled` preserves manual dates.
   */
  autoSchedule: protectedProcedure
    .input(
      z.object({
        strategyId: z.string().min(1),
        startDate: z.string().datetime().optional(),
        cadenceDays: z.number().int().min(1).max(90).optional(),
        onlyUnscheduled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCalendarAccess(ctx.session.user.id, input.strategyId);
      const cadence = input.cadenceDays ?? 14;
      const start = input.startDate ? new Date(input.startDate) : new Date();
      const rows = await ctx.db.brandAction.findMany({
        where: {
          strategyId: input.strategyId,
          selected: true,
          ...(input.onlyUnscheduled ? { timingStart: null } : {}),
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      const DAY = 86_400_000;
      let scheduled = 0;
      for (let i = 0; i < rows.length; i++) {
        const s = new Date(start.getTime() + i * cadence * DAY);
        await ctx.db.brandAction.update({
          where: { id: rows[i]!.id },
          data: { timingStart: s, timingEnd: new Date(s.getTime() + DAY), status: "SCHEDULED" },
        });
        scheduled++;
      }
      return { scheduled };
    }),
});
