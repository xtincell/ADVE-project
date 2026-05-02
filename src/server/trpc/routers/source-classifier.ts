/**
 * Source Classifier tRPC router — exposes the filtreur qualifiant.
 *
 * Surface used by the Cockpit Propositions vault panel:
 *   - proposeFromSource: re-run classifier for one source (manual retrigger)
 *   - listProposalsForStrategy: all DRAFT BrandAssets that came from a source
 *   - acceptProposal: DRAFT → SELECTED (or ACTIVE for kinds in CAMPAIGN_ACTIVE_KIND_FIELDS)
 *   - rejectProposal: DRAFT → REJECTED
 *   - acceptAllForSource: batch accept high-confidence proposals for one source
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { auditedProcedure } from "@/server/governance/governed-procedure";
import { promoteToActive as enginePromoteToActive } from "@/server/services/brand-vault/engine";
import { isBrandAssetKind, BRAND_ASSET_KINDS } from "@/domain/brand-asset-kinds";

const auditedProtected = auditedProcedure(protectedProcedure, "source-classifier");

const ACCEPT_AS_ACTIVE_KINDS: ReadonlySet<string> = new Set([
  "BIG_IDEA",
  "CREATIVE_BRIEF",
  "BRIEF_360",
  "CLAIM",
  "MANIFESTO",
  "KV_ART_DIRECTION_BRIEF",
]);

const HIGH_CONFIDENCE_THRESHOLD = 0.8;

export const sourceClassifierRouter = createTRPCRouter({
  // Trigger classification for a single source (re-run / manual).
  proposeFromSource: auditedProtected
    .input(z.object({
      strategyId: z.string(),
      sourceId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { emitIntent } = await import("@/server/services/mestor/intents");
      const result = await emitIntent(
        {
          kind: "PROPOSE_VAULT_FROM_SOURCE",
          strategyId: input.strategyId,
          sourceId: input.sourceId,
          operatorId: ctx.session.user.id,
        },
        { caller: "source-classifier:proposeFromSource" },
      );
      return result.output ?? { brandAssetIds: [] };
    }),

  // List all DRAFT BrandAsset proposals for a strategy. Used by the
  // Propositions vault panel to render per-source folds.
  listProposalsForStrategy: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const drafts = await ctx.db.brandAsset.findMany({
        where: { strategyId: input.strategyId, state: "DRAFT" },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      // Only return DRAFTs that came from a BrandDataSource (lineage tagged).
      return drafts.filter((a: { metadata: unknown }) => {
        const meta = (a.metadata as Record<string, unknown> | null) ?? null;
        return typeof meta?.sourceDataSourceId === "string";
      });
    }),

  // Accept a DRAFT proposal: optional kind override, then promote.
  // Default behaviour: DRAFT → SELECTED. For canonical "active slot" kinds
  // (BIG_IDEA, CREATIVE_BRIEF, MANIFESTO, …) we promote straight to ACTIVE
  // since there is at most one such asset per strategy.
  acceptProposal: auditedProtected
    .input(z.object({
      brandAssetId: z.string(),
      kindOverride: z.string().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.brandAsset.findUniqueOrThrow({
        where: { id: input.brandAssetId },
      });
      if (asset.state !== "DRAFT") {
        throw new Error(`BrandAsset ${input.brandAssetId} is not in DRAFT state (current: ${asset.state})`);
      }

      // Optional kind override (operator can re-classify if the LLM was wrong).
      let nextKind = asset.kind;
      if (input.kindOverride && input.kindOverride !== asset.kind) {
        if (!isBrandAssetKind(input.kindOverride)) {
          throw new Error(`Invalid BrandAssetKind: ${input.kindOverride}`);
        }
        nextKind = input.kindOverride;
      }

      const promoteToActiveDirect = ACCEPT_AS_ACTIVE_KINDS.has(nextKind);
      await ctx.db.brandAsset.update({
        where: { id: input.brandAssetId },
        data: {
          kind: nextKind,
          state: promoteToActiveDirect ? "SELECTED" : "SELECTED",
          selectedAt: new Date(),
          selectedById: ctx.session.user.id,
          selectedReason: input.reason ?? "Operator accepted classifier proposal.",
        },
      });

      if (promoteToActiveDirect) {
        return enginePromoteToActive({
          brandAssetId: input.brandAssetId,
          promotedById: ctx.session.user.id,
        });
      }

      return ctx.db.brandAsset.findUniqueOrThrow({ where: { id: input.brandAssetId } });
    }),

  rejectProposal: auditedProtected
    .input(z.object({
      brandAssetId: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.brandAsset.findUniqueOrThrow({
        where: { id: input.brandAssetId },
      });
      if (asset.state !== "DRAFT") {
        throw new Error(`BrandAsset ${input.brandAssetId} is not in DRAFT state (current: ${asset.state})`);
      }
      return ctx.db.brandAsset.update({
        where: { id: input.brandAssetId },
        data: {
          state: "REJECTED",
          supersededReason: input.reason ?? null,
        },
      });
    }),

  // Batch accept all DRAFT proposals tied to one source above the
  // HIGH_CONFIDENCE_THRESHOLD. Lower-confidence proposals stay DRAFT for
  // explicit operator review.
  acceptAllForSource: auditedProtected
    .input(z.object({
      strategyId: z.string(),
      sourceDataSourceId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const drafts = await ctx.db.brandAsset.findMany({
        where: { strategyId: input.strategyId, state: "DRAFT" },
        take: 100,
      });
      const matching = drafts.filter((a: { metadata: unknown }) => {
        const meta = (a.metadata as Record<string, unknown> | null) ?? null;
        if (meta?.sourceDataSourceId !== input.sourceDataSourceId) return false;
        const conf = typeof meta?.classifierConfidence === "number" ? meta.classifierConfidence : 0;
        return conf >= HIGH_CONFIDENCE_THRESHOLD;
      });

      const acceptedIds: string[] = [];
      for (const draft of matching) {
        const promoteToActiveDirect = ACCEPT_AS_ACTIVE_KINDS.has(draft.kind);
        await ctx.db.brandAsset.update({
          where: { id: draft.id },
          data: {
            state: "SELECTED",
            selectedAt: new Date(),
            selectedById: ctx.session.user.id,
            selectedReason: "Batch accept (high confidence ≥ 0.8).",
          },
        });
        if (promoteToActiveDirect) {
          await enginePromoteToActive({
            brandAssetId: draft.id,
            promotedById: ctx.session.user.id,
          });
        }
        acceptedIds.push(draft.id);
      }
      return { acceptedIds, totalCandidates: matching.length };
    }),

  // Expose canonical kinds list for the UI dropdown (kind override picker).
  getKinds: protectedProcedure.query(() => {
    return BRAND_ASSET_KINDS;
  }),
});
