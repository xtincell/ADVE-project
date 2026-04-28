import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../init";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedAdmin = auditedProcedure(adminProcedure, "cohort");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

export const cohortRouter = createTRPCRouter({
  /** Analyse cohort de marques par periode d'intake */
  byIntakePeriod: adminProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const intakes = await ctx.db.quickIntake.findMany({
        where: { completedAt: { gte: new Date(input.startDate), lte: new Date(input.endDate) }, status: { in: ["COMPLETED", "CONVERTED"] } },
        select: { id: true, companyName: true, classification: true, sector: true, completedAt: true, advertis_vector: true },
        orderBy: { completedAt: "desc" },
      });
      return { count: intakes.length, intakes };
    }),

  /** Analyse retention par classification */
  retentionByClassification: adminProcedure
    .query(async ({ ctx }) => {
      const strategies = await ctx.db.strategy.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, advertis_vector: true, createdAt: true, updatedAt: true },
      });
      const byClass: Record<string, number> = {};
      for (const s of strategies) {
        const vec = s.advertis_vector as Record<string, number> | null;
        const composite = vec?.composite ?? 0;
        const cls = composite <= 80 ? "ZOMBIE" : composite <= 120 ? "ORDINAIRE" : composite <= 160 ? "FORTE" : composite <= 180 ? "CULTE" : "ICONE";
        byClass[cls] = (byClass[cls] ?? 0) + 1;
      }
      return { total: strategies.length, byClassification: byClass };
    }),
});
