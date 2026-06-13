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
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import { syncBrandActionsFromBlob } from "@/server/services/artemis/action-db/materializer";

const filters = z.object({
  strategyId: z.string().min(1),
  touchpoint: z.string().optional(),
  status: z.string().optional(),
  selected: z.boolean().optional(),
});

export const actionsRouter = createTRPCRouter({
  /** Flat, homogeneous list of the strategy's actions (optionally filtered). */
  byStrategy: protectedProcedure.input(filters).query(async ({ ctx, input }) => {
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
});
