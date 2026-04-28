import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import * as valueReportService from "@/server/services/value-report-generator";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "value-report");
const _auditedAdmin = auditedProcedure(adminProcedure, "value-report");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

export const valueReportRouter = createTRPCRouter({
  generate: adminProcedure
    .input(z.object({ strategyId: z.string(), period: z.string() }))
    .mutation(async ({ input }) => {
      return valueReportService.generate(input.strategyId, input.period);
    }),

  list: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [snapshots, signals] = await Promise.all([
        ctx.db.devotionSnapshot.findMany({
          where: { strategyId: input.strategyId },
          select: { measuredAt: true },
          orderBy: { measuredAt: "desc" },
        }),
        ctx.db.signal.findMany({
          where: { strategyId: input.strategyId },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const periodSet = new Set<string>();
      for (const s of snapshots) {
        periodSet.add(s.measuredAt.toISOString().slice(0, 7));
      }
      for (const s of signals) {
        periodSet.add(s.createdAt.toISOString().slice(0, 7));
      }

      const snapshotPeriods = new Set(snapshots.map((s) => s.measuredAt.toISOString().slice(0, 7)));
      const signalPeriods = new Set(signals.map((s) => s.createdAt.toISOString().slice(0, 7)));

      return Array.from(periodSet)
        .sort()
        .reverse()
        .map((period) => ({
          period,
          hasData: snapshotPeriods.has(period) || signalPeriods.has(period),
        }));
    }),

  getByStrategy: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return valueReportService.generate(input.strategyId, new Date().toISOString().slice(0, 7));
    }),

  export: protectedProcedure
    .input(z.object({ strategyId: z.string(), period: z.string(), format: z.enum(["html", "pdf"]).default("html") }))
    .query(async ({ input }) => {
      return valueReportService.exportHtml(input.strategyId, input.period);
    }),
});
