/**
 * tRPC router — error-vault (Phase 11).
 *
 * List/filter/mark-resolved/stats/batch-clear pour la Console.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { db } from "@/lib/db";
import {
  capture,
  markResolved,
  batchMarkResolved,
  getStats,
} from "@/server/services/error-vault";

const SourceEnum = z.enum([
  "SERVER",
  "CLIENT",
  "PRISMA",
  "NSP",
  "PTAH",
  "STRESS_TEST",
  "CRON",
  "WEBHOOK",
  "UNKNOWN",
]);

const SeverityEnum = z.enum(["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"]);

export const errorVaultRouter = createTRPCRouter({
  // Capture côté client (errors React, console.error, network errors)
  captureClient: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        stack: z.string().optional(),
        code: z.string().optional(),
        route: z.string().optional(),
        componentPath: z.string().optional(),
        userAgent: z.string().optional(),
        context: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = await capture({
        source: "CLIENT",
        severity: "ERROR",
        message: input.message,
        stack: input.stack,
        code: input.code,
        route: input.route,
        componentPath: input.componentPath,
        userAgent: input.userAgent,
        context: input.context,
        userId: ctx.session.user.id,
      });
      return { id };
    }),

  list: protectedProcedure
    .input(
      z.object({
        source: SourceEnum.optional(),
        severity: SeverityEnum.optional(),
        resolved: z.boolean().optional(),
        signature: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ input }) => {
      return db.errorEvent.findMany({
        where: {
          ...(input.source ? { source: input.source } : {}),
          ...(input.severity ? { severity: input.severity } : {}),
          ...(input.resolved !== undefined ? { resolved: input.resolved } : {}),
          ...(input.signature ? { signature: input.signature } : {}),
        },
        orderBy: { lastSeenAt: "desc" },
        take: input.limit,
      });
    }),

  groupBySignature: protectedProcedure
    .input(z.object({ resolved: z.boolean().default(false), limit: z.number().default(100) }))
    .query(async ({ input }) => {
      // Cluster par signature — agrège sample + count
      const events = await db.errorEvent.findMany({
        where: { resolved: input.resolved },
        orderBy: { lastSeenAt: "desc" },
        take: input.limit,
      });
      const clusters = new Map<
        string,
        {
          signature: string;
          sample: typeof events[number];
          totalOccurrences: number;
          firstSeenAt: Date;
          lastSeenAt: Date;
          uniqueRoutes: Set<string>;
          uniqueSources: Set<string>;
        }
      >();
      for (const e of events) {
        const c = clusters.get(e.signature);
        if (c) {
          c.totalOccurrences += e.occurrences;
          if (e.lastSeenAt > c.lastSeenAt) c.lastSeenAt = e.lastSeenAt;
          if (e.firstSeenAt < c.firstSeenAt) c.firstSeenAt = e.firstSeenAt;
          if (e.route) c.uniqueRoutes.add(e.route);
          c.uniqueSources.add(e.source);
        } else {
          clusters.set(e.signature, {
            signature: e.signature,
            sample: e,
            totalOccurrences: e.occurrences,
            firstSeenAt: e.firstSeenAt,
            lastSeenAt: e.lastSeenAt,
            uniqueRoutes: new Set(e.route ? [e.route] : []),
            uniqueSources: new Set([e.source]),
          });
        }
      }
      return Array.from(clusters.values())
        .map((c) => ({
          ...c,
          uniqueRoutes: Array.from(c.uniqueRoutes),
          uniqueSources: Array.from(c.uniqueSources),
        }))
        .sort((a, b) => b.totalOccurrences - a.totalOccurrences);
    }),

  stats: protectedProcedure
    .input(z.object({ sinceHours: z.number().default(24) }).optional())
    .query(async ({ input }) => getStats({ sinceHours: input?.sinceHours })),

  /**
   * Oracle-specific incident view (ADR-0014). Filters ErrorEvent by
   * `code` prefix `ORACLE-` and clusters by code, returning per-code
   * stats + last sample. Used by /console/governance/oracle-incidents.
   */
  oracleIncidents: protectedProcedure
    .input(
      z.object({
        resolved: z.boolean().default(false),
        limit: z.number().int().min(1).max(500).default(200),
        sinceHours: z.number().int().min(1).max(720).default(168),
      }),
    )
    .query(async ({ input }) => {
      const since = new Date(Date.now() - input.sinceHours * 3600_000);
      const events = await db.errorEvent.findMany({
        where: {
          resolved: input.resolved,
          code: { startsWith: "ORACLE-" },
          lastSeenAt: { gte: since },
        },
        orderBy: { lastSeenAt: "desc" },
        take: input.limit,
      });
      const byCode = new Map<
        string,
        {
          code: string;
          totalOccurrences: number;
          uniqueStrategies: Set<string>;
          uniqueIntents: Set<string>;
          firstSeenAt: Date;
          lastSeenAt: Date;
          sample: typeof events[number];
          severity: string;
        }
      >();
      for (const e of events) {
        const code = e.code ?? "ORACLE-???";
        const c = byCode.get(code);
        if (c) {
          c.totalOccurrences += e.occurrences;
          if (e.strategyId) c.uniqueStrategies.add(e.strategyId);
          if (e.intentId) c.uniqueIntents.add(e.intentId);
          if (e.lastSeenAt > c.lastSeenAt) {
            c.lastSeenAt = e.lastSeenAt;
            c.sample = e;
          }
          if (e.firstSeenAt < c.firstSeenAt) c.firstSeenAt = e.firstSeenAt;
        } else {
          byCode.set(code, {
            code,
            totalOccurrences: e.occurrences,
            uniqueStrategies: new Set(e.strategyId ? [e.strategyId] : []),
            uniqueIntents: new Set(e.intentId ? [e.intentId] : []),
            firstSeenAt: e.firstSeenAt,
            lastSeenAt: e.lastSeenAt,
            sample: e,
            severity: e.severity,
          });
        }
      }
      return Array.from(byCode.values())
        .map((c) => ({
          ...c,
          uniqueStrategies: Array.from(c.uniqueStrategies),
          uniqueIntents: Array.from(c.uniqueIntents),
        }))
        .sort((a, b) => b.totalOccurrences - a.totalOccurrences);
    }),

  markResolved: adminProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
        knownFalsePositive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return markResolved({
        id: input.id,
        resolvedById: ctx.session.user.id,
        reason: input.reason,
        knownFalsePositive: input.knownFalsePositive,
      });
    }),

  batchMarkResolved: adminProcedure
    .input(
      z.object({
        signature: z.string().optional(),
        source: SourceEnum.optional(),
        severity: SeverityEnum.optional(),
        reason: z.string().optional(),
        knownFalsePositive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return batchMarkResolved({
        filter: {
          signature: input.signature,
          source: input.source,
          severity: input.severity,
        },
        resolvedById: ctx.session.user.id,
        reason: input.reason,
        knownFalsePositive: input.knownFalsePositive,
      });
    }),
});
