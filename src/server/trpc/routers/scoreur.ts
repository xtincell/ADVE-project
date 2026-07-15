/**
 * ADR-0147 — Scoreur à force révélée : portes gouvernées + LEADERBOARD PUBLIC.
 *
 * `recordEpreuve` / `scoreBrand` : governedProcedure requireOperator (spine
 * ADR-0124). `leaderboard` / `verdict` : publicProcedure (le palmarès est public —
 * données de verdict seulement, aucune PII).
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { db } from "@/lib/db";
import { MarketScaleSchema } from "@/domain/market-scale";
import { ScoreurArenaSchema, EpreuveResultSchema } from "@/domain/scoreur";
import {
  recordEpreuve,
  scoreBrand,
} from "@/server/services/seshat/scoreur";
import { seedScoreurCanon } from "@/server/services/seshat/scoreur/anchor-seed";

const leagueSchema = z.object({
  sectorSlug: z.string().min(1),
  marketScale: MarketScaleSchema.nullish(),
  countryCode: z.string().max(2).nullish(),
});

export const scoreurRouter = createTRPCRouter({
  recordEpreuve: governedProcedure({
    kind: "SESHAT_RECORD_EPREUVE",
    requireOperator: true,
    inputSchema: z.object({
      strategyId: z.string().min(1),
      opponentBrandRefId: z.string().nullish(),
      opponentStrategyId: z.string().nullish(),
      arena: ScoreurArenaSchema,
      league: leagueSchema,
      result: EpreuveResultSchema,
      proofWeight: z.number().min(0).max(1),
      source: z.string().min(1),
      occurredAt: z.string(),
    }),
    caller: "scoreur:recordEpreuve",
  }).mutation(async ({ input }) => {
    return recordEpreuve({
      subjectStrategyId: input.strategyId,
      opponentBrandRefId: input.opponentBrandRefId ?? null,
      opponentStrategyId: input.opponentStrategyId ?? null,
      arena: input.arena,
      league: {
        sectorSlug: input.league.sectorSlug,
        marketScale: input.league.marketScale ?? null,
        countryCode: input.league.countryCode ?? null,
      },
      result: input.result,
      proofWeight: input.proofWeight,
      source: input.source,
      occurredAt: input.occurredAt,
    });
  }),

  scoreBrand: governedProcedure({
    kind: "SESHAT_SCORE_BRAND",
    requireOperator: true,
    inputSchema: z.object({ strategyId: z.string().min(1) }),
    caller: "scoreur:scoreBrand",
  }).mutation(async ({ input }) => {
    return scoreBrand(input.strategyId, { persist: true });
  }),

  /** Seed du canon jauge (ancres + items). Admin. */
  seedCanon: adminProcedure.mutation(async () => {
    return seedScoreurCanon();
  }),

  /** LEADERBOARD PUBLIC : dernier verdict par marque dans une ligue, classé force. */
  leaderboard: publicProcedure
    .input(
      z.object({
        sectorSlug: z.string().nullish(),
        marketScale: MarketScaleSchema.nullish(),
        countryCode: z.string().max(2).nullish(),
        limit: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ input }) => {
      const rows = await db.scoreVerdict.findMany({
        where: {
          ...(input.sectorSlug ? { sectorSlug: input.sectorSlug } : {}),
          ...(input.marketScale ? { marketScale: input.marketScale } : {}),
          ...(input.countryCode ? { countryCode: input.countryCode } : {}),
        },
        orderBy: { computedAt: "desc" },
        take: 500,
      });
      // Dernier verdict par sujet.
      const latest = new Map<string, (typeof rows)[number]>();
      for (const r of rows) {
        const key = r.subjectStrategyId ?? r.subjectBrandRefId ?? r.subjectLabel;
        if (!latest.has(key)) latest.set(key, r);
      }
      return [...latest.values()]
        .sort((a, b) => b.force - a.force)
        .slice(0, input.limit)
        .map((r, i) => ({
          rank: i + 1,
          subjectLabel: r.subjectLabel,
          force: r.force,
          tier: r.tier,
          coherence: r.coherence,
          coveragePct: r.coveragePct,
          sectorSlug: r.sectorSlug,
          marketScale: r.marketScale,
          countryCode: r.countryCode,
          cappedReason: r.cappedReason,
          computedAt: r.computedAt,
        }));
    }),

  /** Verdict complet (palmarès) le plus récent d'une marque — public. */
  verdict: publicProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ input }) => {
      return db.scoreVerdict.findFirst({
        where: { subjectStrategyId: input.strategyId },
        orderBy: { computedAt: "desc" },
      });
    }),
});
