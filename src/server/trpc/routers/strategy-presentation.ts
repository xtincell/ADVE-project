/**
 * Strategy Presentation — tRPC Router
 * Endpoints for assembling, sharing, and checking completeness of strategic proposals.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";
import {
  assemblePresentation,
  getShareToken,
  resolveShareToken,
  checkCompleteness,
} from "@/server/services/strategy-presentation";
import { generateBudgetPlan } from "@/server/services/budget-allocator";
import { enrichAllSections, enrichAllSectionsNeteru } from "@/server/services/strategy-presentation/enrich-oracle";
import { auditedProcedure, governedProcedure } from "@/server/governance/governed-procedure";
const auditedProtected = auditedProcedure(protectedProcedure, "strategy-presentation");
/* lafusee:strangler-active */

export const strategyPresentationRouter = createTRPCRouter({
  /** Assemble the full 13-section document for a strategy (authenticated) */
  assemble: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return assemblePresentation(input.strategyId);
    }),

  /** Generate or retrieve the shareable link for a strategy */
  shareLink: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        persona: z.enum(["consultant", "client", "creative"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { token, url } = await getShareToken(input.strategyId);
      const fullUrl = input.persona ? `${url}?persona=${input.persona}` : url;
      return { token, url: fullUrl, sharedAt: new Date().toISOString() };
    }),

  /** Resolve a public share token to the assembled document (no auth required) */
  resolveToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const strategyId = await resolveShareToken(input.token);
      if (!strategyId) return null;
      return assemblePresentation(strategyId);
    }),

  /** Check which sections have sufficient data */
  completeness: auditedProtected
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return checkCompleteness(input.strategyId);
    }),

  /** Enrich ALL empty/partial Oracle sections by filling pillar gaps via LLM.
   *
   *  Phase 13 R2 — exposition intentId dans le result pour streaming/replay
   *  NSP côté frontend (cf. <OracleEnrichmentTracker intentId={...} />).
   *  L'intentId est créé par governedProcedure preEmitIntent AVANT le handler. */
  enrichOracle: governedProcedure({
    kind: "ENRICH_ORACLE",
    inputSchema: z.object({ strategyId: z.string() }),
    preconditions: ["ORACLE_ENRICH"],
  }).mutation(async ({ input, ctx }) => {
    const result = await enrichAllSections(input.strategyId);
    return { ...result, intentId: (ctx as { intentId?: string }).intentId ?? null };
  }),

  /** NETERU v2: Enrich Oracle via the full trio (Seshat→Mestor→Artemis).
   *  R2 — idem enrichOracle : intentId exposé dans le result. */
  enrichOracleNeteru: governedProcedure({
    kind: "ENRICH_ORACLE",
    inputSchema: z.object({ strategyId: z.string() }),
    preconditions: ["ORACLE_ENRICH"],
  }).mutation(async ({ input, ctx }) => {
    const result = await enrichAllSectionsNeteru(input.strategyId);
    return { ...result, intentId: (ctx as { intentId?: string }).intentId ?? null };
  }),

  /**
   * Phase 13 (B8, ADR-0014) — Ptah forge à la demande pour une section Oracle.
   *
   * Lit le BrandAsset DRAFT promu par B4 writeback, construit un ForgeBrief, et
   * émet PTAH_MATERIALIZE_BRIEF via mestor.emitIntent. Cascade hash-chain
   * Glory→Brief→Forge f9cd9de préservée (oracleEnrichmentMode=false hors
   * enrichissement).
   *
   * Pré-condition Pillar 4 : section state DRAFT + brief content non-vide +
   * THOT.CHECK_CAPACITY pre-flight (gate par governedProcedure).
   */
  forgeForSection: governedProcedure({
    kind: "PTAH_MATERIALIZE_BRIEF",
    inputSchema: z.object({
      strategyId: z.string(),
      sectionId: z.string(),
      brandAssetKind: z.string(),
      forgeKind: z.enum([
        "image", "video", "audio", "icon", "refine",
        "transform", "classify", "stock", "design",
      ]),
      providerHint: z.enum(["magnific", "adobe", "figma", "canva"]).optional(),
      modelHint: z.string().optional(),
      manipulationMode: z.enum(["peddler", "dealer", "facilitator", "entertainer"]).optional(),
    }),
    preconditions: ["RTIS_CASCADE"],
  }).mutation(async ({ input }) => {
    const { db } = await import("@/lib/db");
    const { emitIntent } = await import("@/server/services/mestor/intents");

    // Récupère le BrandAsset DRAFT correspondant (créé par B4 writeback)
    const brandAsset = await db.brandAsset.findFirst({
      where: {
        strategyId: input.strategyId,
        kind: input.brandAssetKind,
        state: "DRAFT",
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!brandAsset) {
      throw new Error(
        `Aucun BrandAsset DRAFT (kind=${input.brandAssetKind}) pour la section ${input.sectionId}. ` +
          `Lancez d'abord enrich-oracle pour produire le brief.`,
      );
    }

    const strategy = await db.strategy.findUnique({
      where: { id: input.strategyId },
      select: { operatorId: true },
    });
    if (!strategy?.operatorId) {
      throw new Error(`Strategy ${input.strategyId} sans operatorId — Pilier 3 violation.`);
    }

    // Construit le ForgeBrief depuis le content brand asset (Phase 9 / ADR-0009 shape).
    // briefText = summary si dispo, sinon stringify content (cap 1000 chars).
    const briefText = typeof brandAsset.summary === "string" && brandAsset.summary.length > 0
      ? brandAsset.summary
      : JSON.stringify(brandAsset.content ?? {}).slice(0, 1000);

    const pillarSource = ((brandAsset.pillarSource ?? "A") as string).toUpperCase() as
      "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S";
    const manipulationMode = (input.manipulationMode ??
      (brandAsset.manipulationMode as "peddler" | "dealer" | "facilitator" | "entertainer" | null) ??
      "facilitator") as "peddler" | "dealer" | "facilitator" | "entertainer";

    const result = await emitIntent(
      {
        kind: "PTAH_MATERIALIZE_BRIEF",
        strategyId: input.strategyId,
        operatorId: strategy.operatorId,
        sourceIntentId: brandAsset.sourceIntentId ?? brandAsset.id,
        brief: {
          briefText,
          forgeSpec: {
            kind: input.forgeKind,
            providerHint: input.providerHint,
            modelHint: input.modelHint,
            parameters: {},
          },
          pillarSource,
          manipulationMode,
        },
      },
      { caller: `oracle-forge:${input.sectionId}` },
    );

    return {
      sectionId: input.sectionId,
      brandAssetId: brandAsset.id,
      status: result.status,
      summary: result.summary,
      reason: result.reason ?? null,
      output: result.output ?? null,
      message: `Forge ${result.status} pour ${input.sectionId} (kind=${input.brandAssetKind}).`,
    };
  }),

  /** Generate deterministic budget plan from raw budget amount */
  budgetPlan: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      budget: z.number().min(0).optional(),
    }))
    .query(async ({ input }) => {
      return generateBudgetPlan(input.strategyId, input.budget);
    }),
});
