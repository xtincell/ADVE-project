/**
 * Superfan Router — Active superfan count as THE northstar metric
 * CdC thresholds: engagementDepth ≥ 0.80 qualifies as active superfan
 * (ambassadeur + evangeliste tiers from devotion engine)
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { DEVOTION_LADDER_TIERS } from "@/domain/devotion-ladder";
import { SUPERFAN_CONDITIONS } from "@/domain/superfan-conditions";
import {
  registerSuperfanProfile,
  listSuperfanCandidates,
} from "@/server/services/seshat/superfan-ingest";
import { db } from "@/lib/db";
import { assertStrategyRead } from "./_strategy-read-guard";
/* lafusee:governed-active */

const ACTIVE_SUPERFAN_THRESHOLD = 0.65; // ambassadeur+ (devotion engine: ≥0.65 = ambassadeur, ≥0.85 = evangeliste)

export const superfanRouter = createTRPCRouter({
  /**
   * ADR-0126 — voie gouvernée UNIQUE de naissance d'un SuperfanProfile.
   * Upsert dédupliqué par (strategyId, platform, handle) — la clé unique du
   * modèle. Toute ingestion (CRM, campagne, saisie manuelle, mesure sociale)
   * passe ici : les rows nourrissent le bras superfans du plafond d'évidence
   * CULTE/ICONE, un chemin non gouverné = vecteur d'inflation par simple
   * footprint.
   * ADR-0134 §B4 : le corps d'écriture vit dans `seshat/superfan-ingest.ts`
   * (single-writer, metadata MERGE) — ce router et le case commandant (chemin
   * cron, mise à jour des profils déjà nés) sont deux portes du MÊME kind.
   * Verrou : test HARD single-writer (scoring-scale-aware.test.ts).
   */
  register: governedProcedure({

    kind: "SESHAT_REGISTER_SUPERFAN",

    requireOperator: true,

    inputSchema: z.object({
      strategyId: z.string(),
      platform: z.string().min(1).max(40),
      handle: z.string().min(1).max(120),
      segment: z.enum(DEVOTION_LADDER_TIERS),
      engagementDepth: z.number().min(0).max(1),
      interactions: z.number().int().nonnegative().optional(),
      lastActiveAt: z.coerce.date().optional(),
      /** Provenance déclarée — audit de l'origine des rows d'évidence. */
      source: z.enum(["MANUAL", "CRM", "CAMPAIGN", "SOCIAL"]).default("MANUAL"),
      /** Nom d'affichage public (mesure inbox) — optionnel. */
      displayName: z.string().max(160).nullish(),
      /**
       * Conditions strictes franchies + preuve (ADR-0141). Le registre clients
       * manuel = register avec `conditions: { PAID: { source: "MANUAL", note } }`.
       */
      conditions: z
        .record(
          z.enum(SUPERFAN_CONDITIONS),
          z.object({
            source: z.string().min(1).max(40),
            at: z.string().datetime().optional(),
            note: z.string().max(280).optional(),
          }),
        )
        .optional(),
    }),

    caller: "superfan:register",

  })
    .mutation(async ({ ctx, input }) => {
      return registerSuperfanProfile(ctx.db, {
        ...input,
        displayName: input.displayName ?? null,
      });
    }),

  /**
   * ADR-0134 §B4 — fans détectés dans les interactions réelles (inbox), PAS
   * ENCORE suivis. Calcul à la volée (aucun modèle), seuil conservateur
   * (≥3 interactions, ≥2 jours actifs). `operatorProcedure` : la liste porte
   * des identités publiques de tiers (PII) et la naissance d'un superfan est
   * un geste opérateur — le clic « Suivre » émet `superfan.register`.
   */
  candidates: operatorProcedure
    .input(z.object({ strategyId: z.string(), windowDays: z.number().int().min(7).max(365).optional() }))
    .query(async ({ input }) => {
      return listSuperfanCandidates(input.strategyId, input.windowDays);
    }),
  /** Count active superfans for a strategy (THE northstar) */
  count: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
      const total = await db.superfanProfile.count({
        where: { strategyId: input.strategyId },
      });

      const active = await db.superfanProfile.count({
        where: {
          strategyId: input.strategyId,
          engagementDepth: { gte: ACTIVE_SUPERFAN_THRESHOLD },
        },
      });

      const evangelistes = await db.superfanProfile.count({
        where: {
          strategyId: input.strategyId,
          engagementDepth: { gte: 0.85 },
        },
      });

      return {
        total,
        active,         // ambassadeur + evangeliste
        evangelistes,    // top tier only
        // lafusee:allow-adhoc-completion: superfan tier distribution (audience %, not pillar)
        ratio: total > 0 ? Math.round((active / total) * 100) : 0,
      };
    }),

  /** Velocity: new superfans gained in last N days */
  velocity: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      days: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const previousPeriodStart = new Date();
      previousPeriodStart.setDate(previousPeriodStart.getDate() - input.days * 2);

      const newActive = await db.superfanProfile.count({
        where: {
          strategyId: input.strategyId,
          engagementDepth: { gte: ACTIVE_SUPERFAN_THRESHOLD },
          createdAt: { gte: since },
        },
      });

      const previousActive = await db.superfanProfile.count({
        where: {
          strategyId: input.strategyId,
          engagementDepth: { gte: ACTIVE_SUPERFAN_THRESHOLD },
          createdAt: { gte: previousPeriodStart, lt: since },
        },
      });

      const delta = newActive - previousActive;
      const trend: "up" | "down" | "stable" = delta > 0 ? "up" : delta < 0 ? "down" : "stable";

      return {
        newActive,
        previousActive,
        delta,
        trend,
        periodDays: input.days,
      };
    }),

  /** Segment breakdown by devotion tier */
  segments: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
      const profiles = await db.superfanProfile.findMany({
        where: { strategyId: input.strategyId },
        select: { engagementDepth: true, platform: true },
      });

      const tiers = { spectateur: 0, interesse: 0, participant: 0, engage: 0, ambassadeur: 0, evangeliste: 0 };

      for (const p of profiles) {
        if (p.engagementDepth >= 0.85) tiers.evangeliste++;
        else if (p.engagementDepth >= 0.65) tiers.ambassadeur++;
        else if (p.engagementDepth >= 0.45) tiers.engage++;
        else if (p.engagementDepth >= 0.25) tiers.participant++;
        else if (p.engagementDepth >= 0.10) tiers.interesse++;
        else tiers.spectateur++;
      }

      const platforms: Record<string, number> = {};
      for (const p of profiles) {
        if (p.engagementDepth >= ACTIVE_SUPERFAN_THRESHOLD) {
          platforms[p.platform] = (platforms[p.platform] ?? 0) + 1;
        }
      }

      return { tiers, platforms, total: profiles.length };
    }),

  /** Top superfan profiles (for display) */
  top: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      limit: z.number().default(10),
    }))
    .query(async ({ ctx, input }) => {
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
      return db.superfanProfile.findMany({
        where: {
          strategyId: input.strategyId,
          engagementDepth: { gte: ACTIVE_SUPERFAN_THRESHOLD },
        },
        orderBy: { engagementDepth: "desc" },
        take: input.limit,
        select: {
          id: true,
          handle: true,
          platform: true,
          engagementDepth: true,
          segment: true,
          interactions: true,
          lastActiveAt: true,
        },
      });
    }),
});
