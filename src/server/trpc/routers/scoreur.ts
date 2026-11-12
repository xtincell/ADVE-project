/**
 * ADR-0149 — Scoreur à force révélée : portes gouvernées + LEADERBOARD PUBLIC.
 *
 * `recordEpreuve` / `scoreBrand` : governedProcedure requireOperator (spine
 * ADR-0124). `leaderboard` / `verdict` : publicProcedure (le palmarès est public —
 * données de verdict seulement, aucune PII).
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure, operatorProcedure } from "../init";
import { accessibleStrategyIds, assertRawStrategyScope, strategyScopedProcedure } from "../middleware/strategy-scope";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { db } from "@/lib/db";
import { MarketScaleSchema } from "@/domain/market-scale";
import { ScoreurArenaSchema, EpreuveResultSchema, leagueKeyString } from "@/domain/scoreur";
import {
  recordEpreuve,
  scoreBrand,
  resolveLeagueForStrategy,
  loadAnchorsForLeague,
  listLatestPublicVerdicts,
} from "@/server/services/seshat/scoreur";
import { getOperatorContext } from "@/server/services/operator-isolation";
import { scoreProspect } from "@/server/services/seshat/scoreur/prospect";
import { decideCandidate, listCandidates } from "@/server/services/seshat/scoreur/candidates";
import { huntVictories } from "@/server/services/seshat/argos/victory-hunt";
import { TRPCError } from "@trpc/server";
import { seedScoreurCanon } from "@/server/services/seshat/scoreur/anchor-seed";
import {
  getCanonForConsole,
  upsertGaugeOverride,
  upsertItemOverride,
  upsertRevealedThresholdsOverride,
  removeItemOverride,
  resetCanonOverride,
  updateAnchorTheta,
} from "@/server/services/seshat/scoreur/canon";
import { BRAND_TIERS } from "@/domain/brand-tier";

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
    return db.$transaction(async (tx) => {
      const league = await resolveLeagueForStrategy(input.strategyId, tx);
      const supplied = { sectorSlug: input.league.sectorSlug, marketScale: input.league.marketScale ?? null, countryCode: input.league.countryCode ?? null };
      if (leagueKeyString(supplied) !== leagueKeyString(league)) throw new TRPCError({ code: "BAD_REQUEST", message: "La ligue doit correspondre à la marque étudiée" });
      if (!!input.opponentBrandRefId === !!input.opponentStrategyId) throw new TRPCError({ code: "BAD_REQUEST", message: "Choisissez un adversaire identifié" });
      if (input.opponentStrategyId === input.strategyId) throw new TRPCError({ code: "BAD_REQUEST", message: "Choisissez un rival distinct de la marque étudiée" });
      if (input.opponentStrategyId && !(await tx.strategy.findUnique({ where: { id: input.opponentStrategyId }, select: { id: true } }))) throw new TRPCError({ code: "NOT_FOUND", message: "Adversaire introuvable" });
      if (input.opponentBrandRefId) {
        const ref = await tx.brandRef.findUnique({ where: { id: input.opponentBrandRefId }, select: { id: true, fixedTheta: true } });
        if (!ref) throw new TRPCError({ code: "NOT_FOUND", message: "Adversaire introuvable" });
        if (ref.fixedTheta != null && (await loadAnchorsForLeague(league, tx))[ref.id] === undefined) throw new TRPCError({ code: "BAD_REQUEST", message: "Cet étalon ne concerne pas cette ligue" });
      }
      const observation = await recordEpreuve({
        subjectStrategyId: input.strategyId,
        opponentBrandRefId: input.opponentBrandRefId ?? null,
        opponentStrategyId: input.opponentStrategyId ?? null,
        arena: input.arena,
        league,
        result: input.result,
        proofWeight: input.proofWeight,
        source: input.source,
        occurredAt: input.occurredAt,
      }, tx);
      const score = await scoreBrand(input.strategyId, { persist: true, client: tx });
      return { ...observation, score };
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

  // ── ADR-0150 : canon éditable a posteriori (ratification opérateur) ──────────

  /** Lecture opérateur : ancres/items (θ) + jauge + items résolus. */
  getCanon: protectedProcedure.query(async () => {
    return getCanonForConsole();
  }),

  /** Édite le canon (jauge / item / θ d'ancre). Op discriminée. */
  editCanon: governedProcedure({
    kind: "SESHAT_EDIT_SCOREUR_CANON",
    requireOperator: true,
    inputSchema: z.discriminatedUnion("op", [
      z.object({
        op: z.literal("SET_GAUGE"),
        marketScale: MarketScaleSchema,
        floor: z.number(),
        icone: z.number(),
      }),
      z.object({
        op: z.literal("SET_ITEM"),
        itemId: z.string().min(1).regex(/^[a-z0-9-]+$/),
        tier: z.enum(BRAND_TIERS),
        label: z.string().min(1),
        arena: z.enum(["A", "D", "V", "E", "T", "R", "TENURE"]),
        order: z.number().int().optional(),
      }),
      z.object({ op: z.literal("REMOVE_ITEM"), itemId: z.string().min(1) }),
      z.object({ op: z.literal("SET_ANCHOR_THETA"), slug: z.string().min(1), fixedTheta: z.number() }),
      z.object({
        op: z.literal("SET_REVEALED_THRESHOLDS"),
        mytheMinDomainAgeYears: z.number().min(0).max(100),
        marketFitMinPress: z.number().int().min(1).max(50),
      }),
    ]),
    caller: "scoreur:editCanon",
  }).mutation(async ({ input, ctx }) => {
    const userId = ctx.session?.user?.id ?? null;
    switch (input.op) {
      case "SET_GAUGE":
        if (input.icone <= input.floor) throw new Error("icone doit être > floor");
        return upsertGaugeOverride({ marketScale: input.marketScale, floor: input.floor, icone: input.icone, userId });
      case "SET_ITEM":
        return upsertItemOverride({ itemId: input.itemId, tier: input.tier, label: input.label, arena: input.arena, order: input.order, userId });
      case "REMOVE_ITEM":
        return removeItemOverride({ itemId: input.itemId, userId });
      case "SET_ANCHOR_THETA":
        return updateAnchorTheta({ slug: input.slug, fixedTheta: input.fixedTheta });
      case "SET_REVEALED_THRESHOLDS":
        return upsertRevealedThresholdsOverride({
          mytheMinDomainAgeYears: input.mytheMinDomainAgeYears,
          marketFitMinPress: input.marketFitMinPress,
          userId,
        });
    }
  }),

  /** Réinitialise un override (retour au défaut code). */
  resetCanon: governedProcedure({
    kind: "SESHAT_RESET_SCOREUR_CANON",
    requireOperator: true,
    inputSchema: z.object({ kind: z.enum(["GAUGE", "ITEM", "REVEALED_GATE"]), key: z.string().min(1) }),
    caller: "scoreur:resetCanon",
  }).mutation(async ({ input }) => {
    return resetCanonOverride({ kind: input.kind, key: input.key });
  }),

  // ── ADR-0154 : Prospect Scoring (surface gouvernée) ──────────────────────────

  /** Place UNE marque externe sur le leaderboard : shell → footprint → score. 0 LLM. */
  scoreProspect: governedProcedure({
    kind: "SESHAT_SCORE_PROSPECT",
    requireOperator: true,
    inputSchema: z.object({
      name: z.string().min(1).max(160),
      sectorRaw: z.string().max(160).nullish(),
      countryCode: z.string().max(2).nullish(),
      marketScale: MarketScaleSchema.nullish(),
      websiteUrl: z.string().max(300).nullish(),
      socialLinksRaw: z.string().max(1000).nullish(),
    }),
    caller: "scoreur:scoreProspect",
  }).mutation(async ({ input, ctx }) => {
    const user = ctx.session!.user;
    const { operatorId } = await getOperatorContext(user.id, ctx.db);
    if (!operatorId) throw new TRPCError({ code: "BAD_REQUEST", message: "Aucun opérateur associé" });
    return scoreProspect({
      operatorId,
      ownerUserId: user.id,
      name: input.name,
      sectorRaw: input.sectorRaw ?? null,
      countryCode: input.countryCode ?? null,
      marketScale: input.marketScale ?? null,
      websiteUrl: input.websiteUrl ?? null,
      socialLinksRaw: input.socialLinksRaw ?? null,
    });
  }),

  /** Hunter (LLM) : cherche des victoires documentées sujet↔rival → quarantaine. */
  huntVictories: governedProcedure({
    kind: "SESHAT_HUNT_VICTORIES",
    requireOperator: true,
    inputSchema: z.object({
      subjectStrategyId: z.string().min(1),
      rivalName: z.string().min(1).max(160),
      rivalStrategyId: z.string().nullish(),
    }).transform((input) => ({ ...input, strategyId: input.subjectStrategyId })),
    caller: "scoreur:huntVictories",
  }).mutation(async ({ input }) => {
    const strat = await db.strategy.findUnique({
      where: { id: input.subjectStrategyId },
      select: { name: true, countryCode: true, client: { select: { sector: true } } },
    });
    if (!strat) throw new TRPCError({ code: "NOT_FOUND", message: "Stratégie sujet introuvable" });
    return huntVictories({
      subjectStrategyId: input.subjectStrategyId,
      subjectName: strat.name,
      rivalName: input.rivalName,
      rivalStrategyId: input.rivalStrategyId ?? null,
      sector: strat.client?.sector ?? null,
      market: strat.countryCode ?? null,
    });
  }),

  /** Décision opérateur sur une victoire candidate (APPROVE→recordEpreuve / REJECT). */
  decideCandidate: governedProcedure({
    kind: "SESHAT_DECIDE_EPREUVE_CANDIDATE",
    requireOperator: true,
    inputSchema: z.object({
      candidateId: z.string().min(1),
      decision: z.enum(["APPROVE", "REJECT"]),
      strategyId: z.string().min(1).optional(),
      rivalStrategyId: z.string().min(1).optional(),
      occurredAt: z.string().datetime().optional(),
    }),
    caller: "scoreur:decideCandidate",
  }).mutation(async ({ input, ctx }) => {
    const candidate = await db.epreuveCandidate.findUnique({ where: { id: input.candidateId }, select: { subjectStrategyId: true } });
    if (!candidate) throw new TRPCError({ code: "NOT_FOUND", message: "Preuve proposée introuvable" });
    await assertRawStrategyScope(ctx.session!.user.id, { strategyId: candidate.subjectStrategyId });
    if (input.strategyId && input.strategyId !== candidate.subjectStrategyId) throw new TRPCError({ code: "BAD_REQUEST", message: "Cette preuve concerne une autre marque" });
    return decideCandidate({
      candidateId: input.candidateId,
      decision: input.decision,
      reviewedBy: ctx.session?.user?.id ?? "operator",
      rivalStrategyId: input.rivalStrategyId,
      occurredAt: input.occurredAt,
    });
  }),

  /** File de revue : victoires candidates (opérateur, lecture). */
  listCandidates: operatorProcedure
    .input(z.object({ subjectStrategyId: z.string().nullish(), status: z.string().nullish() }).optional())
    .query(async ({ input, ctx }) => {
      if (input?.subjectStrategyId) await assertRawStrategyScope(ctx.session.user.id, { strategyId: input.subjectStrategyId });
      const ids = input?.subjectStrategyId ? null : await accessibleStrategyIds(ctx.session.user.id);
      return listCandidates({
        subjectStrategyId: input?.subjectStrategyId ?? undefined,
        status: input?.status ?? undefined,
        ...(ids === null ? {} : { subjectStrategyIds: ids }),
      });
    }),

  /** Preview d'impact : re-score une marque SANS persister (voir l'effet d'un edit). */
  previewBrand: strategyScopedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const r = await scoreBrand(input.strategyId, { persist: false });
      return { verdict: r.verdict, epreuveCount: r.epreuveCount, superfanCount: r.superfanCount };
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
      const rows = await listLatestPublicVerdicts(input);
      const ranks = new Map<string, number>();
      return rows.map(r => {
        const league = leagueKeyString(r), rank = (ranks.get(league) ?? 0) + 1;
        ranks.set(league, rank);
        return {
          rank,
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
        };
      });
    }),

  /** Verdict complet (palmarès) le plus récent d'une marque — public. */
  verdict: publicProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ input }) => {
      return db.scoreVerdict.findFirst({
        where: { subjectStrategyId: input.strategyId },
        orderBy: [{ computedAt: "desc" }, { id: "desc" }],
      });
    }),
});
