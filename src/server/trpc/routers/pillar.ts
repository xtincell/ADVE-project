/**
 * Pillar CRUD Router — Édition complète de la fiche ADVE-RTIS
 * Full CRUD avec validation Zod, scoring sémantique, et propagation de staleness
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import * as pillarVersioning from "@/server/services/pillar-versioning";
import { PILLAR_SCHEMAS, validatePillarContent, validatePillarPartial, type PillarKey } from "@/lib/types/pillar-schemas";
import { validateCrossReferences, getCrossRefSummary } from "@/server/services/cross-validator";
import { scorePillarSemantic, scoreAllPillarsSemantic } from "@/server/services/advertis-scorer/semantic";
import { propagateFromPillar } from "@/server/services/staleness-propagator";

const pillarKeyEnum = z.enum(["A", "D", "V", "E", "R", "T", "I", "S"]);

export const pillarRouter = createTRPCRouter({
  /** Get a single pillar with validation status and semantic score */
  get: protectedProcedure
    .input(z.object({ strategyId: z.string(), key: pillarKeyEnum }))
    .query(async ({ ctx, input }) => {
      const pillar = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: input.key.toLowerCase() } },
      });

      if (!pillar) return { pillar: null, validation: null, score: null };

      const validation = validatePillarPartial(input.key, pillar.content);
      const score = scorePillarSemantic(input.key, pillar.content);

      return { pillar, validation, score };
    }),

  /** Get all 8 pillars with completion map */
  getAll: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const pillars = await ctx.db.pillar.findMany({ where: { strategyId: input.strategyId } });

      const map: Record<string, { content: unknown; completion: number; score: number; errors: number }> = {};
      for (const key of ["A", "D", "V", "E", "R", "T", "I", "S"]) {
        const pillar = pillars.find((p) => p.key.toUpperCase() === key);
        if (pillar) {
          const validation = validatePillarPartial(key as PillarKey, pillar.content);
          const semanticScore = scorePillarSemantic(key as PillarKey, pillar.content);
          map[key] = {
            content: pillar.content,
            completion: validation.completionPercentage,
            score: semanticScore.score,
            errors: validation.errors?.length ?? 0,
          };
        } else {
          map[key] = { content: null, completion: 0, score: 0, errors: 0 };
        }
      }

      return map;
    }),

  /** Full update — strict validation against Zod schema (cannot change validationStatus) */
  updateFull: protectedProcedure
    .input(z.object({ strategyId: z.string(), key: pillarKeyEnum, content: z.record(z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      // Strip validationStatus from content — status transitions must go through transitionStatus
      const { validationStatus: _stripped, ...sanitizedContent } = input.content;

      const validation = validatePillarContent(input.key, sanitizedContent);
      if (!validation.success) {
        return { success: false, errors: validation.errors };
      }

      // Version history: snapshot before change
      const existingForVersion = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: input.key.toLowerCase() } },
      });
      if (existingForVersion) {
        await pillarVersioning.createVersion({
          pillarId: existingForVersion.id,
          content: sanitizedContent as Record<string, unknown>,
          author: ctx.session.user.id,
          reason: "manual_edit",
        }).catch((err) => { console.warn("[pillar-versioning] snapshot failed:", err instanceof Error ? err.message : err); });
      }

      await ctx.db.pillar.upsert({
        where: { strategyId_key: { strategyId: input.strategyId, key: input.key.toLowerCase() } },
        update: { content: sanitizedContent as Prisma.InputJsonValue, confidence: 0.8, staleAt: null },
        create: { strategyId: input.strategyId, key: input.key.toLowerCase(), content: sanitizedContent as Prisma.InputJsonValue, confidence: 0.8 },
      });

      // Trigger staleness propagation
      await propagateFromPillar(input.strategyId, input.key).catch((err) => { console.warn("[staleness] propagation failed:", err instanceof Error ? err.message : err); });

      // Recalculate score
      const allPillars = await ctx.db.pillar.findMany({ where: { strategyId: input.strategyId } });
      const scoreResult = await scoreAllPillarsSemantic(allPillars.map((p) => ({ key: p.key, content: p.content })));

      // Update strategy's advertis_vector
      const vec: Record<string, number> = { composite: scoreResult.composite };
      for (const ps of scoreResult.pillarScores) {
        vec[ps.pillarKey.toLowerCase()] = ps.score;
      }
      await ctx.db.strategy.update({
        where: { id: input.strategyId },
        data: { advertis_vector: vec as Prisma.InputJsonValue },
      });

      return { success: true, score: scoreResult };
    }),

  /** Partial/draft update — lenient validation, saves even if incomplete */
  updatePartial: protectedProcedure
    .input(z.object({ strategyId: z.string(), key: pillarKeyEnum, content: z.record(z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      // Merge with existing content
      const existing = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: input.key.toLowerCase() } },
      });
      const merged = { ...(existing?.content as Record<string, unknown> ?? {}), ...input.content };

      const validation = validatePillarPartial(input.key, merged);

      // Version history: snapshot before change
      if (existing) {
        await pillarVersioning.createVersion({
          pillarId: existing.id,
          content: merged as Record<string, unknown>,
          author: ctx.session.user.id,
          reason: "partial_edit",
        }).catch((err) => { console.warn("[pillar-versioning] snapshot failed:", err instanceof Error ? err.message : err); });
      }

      await ctx.db.pillar.upsert({
        where: { strategyId_key: { strategyId: input.strategyId, key: input.key.toLowerCase() } },
        update: { content: merged as Prisma.InputJsonValue, staleAt: null },
        create: { strategyId: input.strategyId, key: input.key.toLowerCase(), content: merged as Prisma.InputJsonValue, confidence: 0.5 },
      });

      // Recalculate score
      const allPillars = await ctx.db.pillar.findMany({ where: { strategyId: input.strategyId } });
      const scoreResult = await scoreAllPillarsSemantic(allPillars.map((p) => ({ key: p.key, content: p.content })));

      const vec: Record<string, number> = { composite: scoreResult.composite };
      for (const ps of scoreResult.pillarScores) {
        vec[ps.pillarKey.toLowerCase()] = ps.score;
      }
      await ctx.db.strategy.update({
        where: { id: input.strategyId },
        data: { advertis_vector: vec as Prisma.InputJsonValue },
      });

      return { success: true, validation, score: scoreResult, merged };
    }),

  /** Dry-run validation — no save */
  validate: protectedProcedure
    .input(z.object({ strategyId: z.string(), key: pillarKeyEnum, content: z.record(z.unknown()) }))
    .query(({ input }) => {
      const full = validatePillarContent(input.key, input.content);
      const partial = validatePillarPartial(input.key, input.content);
      const score = scorePillarSemantic(input.key, input.content);
      return { fullValidation: full, partialValidation: partial, score };
    }),

  /** Cross-pillar validation */
  validateCrossRefs: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(({ input }) => validateCrossReferences(input.strategyId)),

  /** Cross-ref summary */
  crossRefSummary: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(({ input }) => getCrossRefSummary(input.strategyId)),

  /** Completion map for all 8 pillars */
  getCompletionMap: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const pillars = await ctx.db.pillar.findMany({ where: { strategyId: input.strategyId } });
      const map: Record<string, number> = {};
      for (const key of ["A", "D", "V", "E", "R", "T", "I", "S"]) {
        const pillar = pillars.find((p) => p.key.toUpperCase() === key);
        if (pillar) {
          const v = validatePillarPartial(key as PillarKey, pillar.content);
          map[key] = v.completionPercentage;
        } else {
          map[key] = 0;
        }
      }
      return map;
    }),

  /** Convenience: add a product to V.produitsCatalogue */
  addProduct: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      product: z.object({
        nom: z.string(), categorie: z.string(), prix: z.number(), cout: z.number(),
        gainClientConcret: z.string(), lienPromesse: z.string(), segmentCible: z.string(),
        phaseLifecycle: z.string(), canalDistribution: z.array(z.string()),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const pillar = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: "v" } },
      });
      const content = (pillar?.content as Record<string, unknown>) ?? {};
      const catalogue = getArraySafe(content.produitsCatalogue);
      catalogue.push(input.product);
      content.produitsCatalogue = catalogue;

      await ctx.db.pillar.upsert({
        where: { strategyId_key: { strategyId: input.strategyId, key: "v" } },
        update: { content: content as Prisma.InputJsonValue },
        create: { strategyId: input.strategyId, key: "v", content: content as Prisma.InputJsonValue },
      });

      return { success: true, productCount: catalogue.length };
    }),

  /** Convenience: add a persona to D.personas */
  addPersona: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      persona: z.object({
        name: z.string(), motivations: z.string(), rank: z.number(),
        schwartzValues: z.array(z.string()).optional(),
        lf8Dominant: z.array(z.string()).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const pillar = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: "d" } },
      });
      const content = (pillar?.content as Record<string, unknown>) ?? {};
      const personas = getArraySafe(content.personas);
      personas.push(input.persona);
      content.personas = personas;

      await ctx.db.pillar.upsert({
        where: { strategyId_key: { strategyId: input.strategyId, key: "d" } },
        update: { content: content as Prisma.InputJsonValue },
        create: { strategyId: input.strategyId, key: "d", content: content as Prisma.InputJsonValue },
      });

      return { success: true, personaCount: personas.length };
    }),

  /** Convenience: add a touchpoint to E.touchpoints */
  addTouchpoint: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      touchpoint: z.object({
        canal: z.string(), type: z.string(), channelRef: z.string(),
        role: z.string(), aarrStage: z.string(), devotionLevel: z.array(z.string()),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const pillar = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: "e" } },
      });
      const content = (pillar?.content as Record<string, unknown>) ?? {};
      const touchpoints = getArraySafe(content.touchpoints);
      touchpoints.push(input.touchpoint);
      content.touchpoints = touchpoints;

      await ctx.db.pillar.upsert({
        where: { strategyId_key: { strategyId: input.strategyId, key: "e" } },
        update: { content: content as Prisma.InputJsonValue },
        create: { strategyId: input.strategyId, key: "e", content: content as Prisma.InputJsonValue },
      });

      return { success: true, touchpointCount: touchpoints.length };
    }),

  /** Convenience: add a ritual to E.rituels */
  addRitual: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      ritual: z.object({
        nom: z.string(), type: z.string(), description: z.string(),
        devotionLevels: z.array(z.string()), aarrPrimary: z.string(), kpiMeasure: z.string(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const pillar = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: "e" } },
      });
      const content = (pillar?.content as Record<string, unknown>) ?? {};
      const rituels = getArraySafe(content.rituels);
      rituels.push(input.ritual);
      content.rituels = rituels;

      await ctx.db.pillar.upsert({
        where: { strategyId_key: { strategyId: input.strategyId, key: "e" } },
        update: { content: content as Prisma.InputJsonValue },
        create: { strategyId: input.strategyId, key: "e", content: content as Prisma.InputJsonValue },
      });

      return { success: true, ritualCount: rituels.length };
    }),

  /** Convenience: add a BrandValue to A.valeurs (with Schwartz validation) */
  addValue: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      value: z.object({
        value: z.string(), customName: z.string(), rank: z.number(),
        justification: z.string(), costOfHolding: z.string(),
        tensionWith: z.array(z.string()).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const pillar = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: "a" } },
      });
      const content = (pillar?.content as Record<string, unknown>) ?? {};
      const valeurs = getArraySafe(content.valeurs);

      if (valeurs.length >= 7) {
        return { success: false, error: "Maximum 7 valeurs autorisées" };
      }

      valeurs.push(input.value);
      content.valeurs = valeurs;

      await ctx.db.pillar.upsert({
        where: { strategyId_key: { strategyId: input.strategyId, key: "a" } },
        update: { content: content as Prisma.InputJsonValue },
        create: { strategyId: input.strategyId, key: "a", content: content as Prisma.InputJsonValue },
      });

      return { success: true, valueCount: valeurs.length };
    }),

  /** Transition pillar validation status with gates */
  transitionStatus: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      key: pillarKeyEnum,
      targetStatus: z.enum(["DRAFT", "AI_PROPOSED", "VALIDATED", "LOCKED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const pillar = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: input.key.toLowerCase() } },
      });
      if (!pillar) return { success: false, error: "Pillar not found" };

      const currentStatus = pillar.validationStatus ?? "DRAFT";

      // Enforce valid transitions
      const validTransitions: Record<string, string[]> = {
        DRAFT: ["AI_PROPOSED", "VALIDATED"],
        AI_PROPOSED: ["DRAFT", "VALIDATED"],
        VALIDATED: ["LOCKED", "DRAFT"],
        LOCKED: ["DRAFT"], // Can only unlock back to DRAFT
      };

      const allowed = validTransitions[currentStatus] ?? [];
      if (!allowed.includes(input.targetStatus)) {
        return {
          success: false,
          error: `Transition invalide: ${currentStatus} → ${input.targetStatus}. Transitions permises: ${allowed.join(", ")}`,
        };
      }

      // Gate: Cannot validate a stale pillar
      if (input.targetStatus === "VALIDATED" && pillar.staleAt) {
        return {
          success: false,
          error: `Impossible de valider: le pilier ${input.key} est marque obsolete depuis le ${pillar.staleAt.toLocaleDateString("fr-FR")}. Mettez a jour le contenu d'abord.`,
          staleAt: pillar.staleAt.toISOString(),
        };
      }

      // Gate: VALIDATED requires no stale dependencies
      if (input.targetStatus === "VALIDATED") {
        const { checkStaleness } = await import("@/server/services/staleness-propagator");
        const staleness = await checkStaleness(input.strategyId, input.key);
        if (staleness.isStale) {
          return {
            success: false,
            error: `Impossible de valider: pilier ${input.key} est stale depuis ${staleness.staleDays} jour(s). Mettez a jour les dependances (${staleness.dependsOn.join(", ")}) ou rafraichissez ce pilier.`,
            staleness,
          };
        }
      }

      // Gate: VALIDATED requires cross-validation check
      if (input.targetStatus === "VALIDATED") {
        const crossRefSummary = await getCrossRefSummary(input.strategyId);
        if (crossRefSummary.invalid > 0) {
          return {
            success: false,
            error: `Impossible de valider: ${crossRefSummary.invalid} violation(s) cross-pilier detectee(s). Corrigez-les d'abord.`,
            crossRefSummary,
          };
        }
      }

      // Gate: LOCKED requires minimum confidence
      if (input.targetStatus === "LOCKED") {
        if ((pillar.confidence ?? 0) < 0.7) {
          return {
            success: false,
            error: `Impossible de verrouiller: confiance insuffisante (${(pillar.confidence ?? 0).toFixed(2)} < 0.70).`,
          };
        }
      }

      await ctx.db.pillar.update({
        where: { id: pillar.id },
        data: { validationStatus: input.targetStatus },
      });

      // If all ADVE are VALIDATED, check for RTIS trigger
      if (input.targetStatus === "VALIDATED" && ["a", "d", "v", "e"].includes(input.key.toLowerCase())) {
        const advePillars = await ctx.db.pillar.findMany({
          where: {
            strategyId: input.strategyId,
            key: { in: ["a", "d", "v", "e"] },
          },
        });
        const allValidated = advePillars.length === 4 && advePillars.every((p) => p.validationStatus === "VALIDATED");
        if (allValidated) {
          // Create a signal to trigger RTIS generation
          await ctx.db.signal.create({
            data: {
              strategyId: input.strategyId,
              type: "ADVE_VALIDATED",
              data: { trigger: "all_4_adve_pillars_validated", validatedAt: new Date().toISOString() },
            },
          });
        }
      }

      return { success: true, newStatus: input.targetStatus };
    }),

  /** Apply a GLORY tool output to D.directionArtistique */
  applyGloryOutput: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      gloryOutputId: z.string(),
      targetField: z.enum([
        "semioticAnalysis", "visualLandscape", "moodboard", "chromaticStrategy",
        "typographySystem", "logoTypeRecommendation", "logoValidation",
        "designTokens", "motionIdentity", "brandGuidelines",
      ]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Load the glory output
      const gloryOutput = await ctx.db.gloryOutput.findUniqueOrThrow({
        where: { id: input.gloryOutputId },
      });

      const output = gloryOutput.output as Record<string, unknown>;

      // Strip _meta from the output before applying
      const { _meta, ...cleanOutput } = output;

      // Load or create D pillar
      const pillar = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: "d" } },
      });
      const content = (pillar?.content as Record<string, unknown>) ?? {};
      const directionArtistique = (content.directionArtistique as Record<string, unknown>) ?? {};

      // Apply the output with gloryOutputId reference
      directionArtistique[input.targetField] = {
        ...cleanOutput,
        gloryOutputId: input.gloryOutputId,
      };
      content.directionArtistique = directionArtistique;

      await ctx.db.pillar.upsert({
        where: { strategyId_key: { strategyId: input.strategyId, key: "d" } },
        update: { content: content as Prisma.InputJsonValue },
        create: { strategyId: input.strategyId, key: "d", content: content as Prisma.InputJsonValue, confidence: 0.6 },
      });

      return { success: true, field: input.targetField };
    }),

  /** Get version history for a pillar */
  getVersionHistory: protectedProcedure
    .input(z.object({ strategyId: z.string(), key: pillarKeyEnum, limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const pillar = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: input.key.toLowerCase() } },
      });
      if (!pillar) return { versions: [], currentVersion: 0 };

      const versions = await pillarVersioning.getHistory(pillar.id, input.limit);
      return { versions, currentVersion: pillar.currentVersion ?? 1 };
    }),

  /** Rollback a pillar to a previous version */
  rollbackVersion: operatorProcedure
    .input(z.object({ strategyId: z.string(), key: pillarKeyEnum, versionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pillar = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: input.key.toLowerCase() } },
      });
      if (!pillar) return { success: false, error: "Pillar not found" };

      await pillarVersioning.rollback(pillar.id, input.versionId, ctx.session.user.id);

      // Propagate staleness after rollback
      await propagateFromPillar(input.strategyId, input.key).catch((err) => {
        console.warn("[staleness] propagation after rollback failed:", err instanceof Error ? err.message : err);
      });

      return { success: true };
    }),
});

function getArraySafe(val: unknown): unknown[] {
  return Array.isArray(val) ? [...val] : [];
}
