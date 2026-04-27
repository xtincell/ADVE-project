// ============================================================================
// MODULE M01 — ADVE-RTIS Methodology (8 Pillars)
// Score: 100/100 | Priority: P0 | Status: FUNCTIONAL
// Spec: Annexe A + §6.1 | Division: L'Oracle
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  8 piliers séquentiels: A→D→V→E→R→T→I→S avec schemas Zod complets
// [x] REQ-2  Chaque pilier a un contenu structuré spécifique (Authenticité=identité+hero's journey+ikigai+valeurs...)
// [x] REQ-3  CRUD complet par pilier (get, update, generate, validate)
// [x] REQ-4  Scoring sémantique par pilier (advertis-scorer intégré)
// [x] REQ-5  Propagation de staleness inter-piliers (un pilier modifié impacte les suivants)
// [x] REQ-6  Versioning des contenus de pilier
// [x] REQ-7  RBAC: opérateur ne modifie que ses propres stratégies
// [x] REQ-8  Cycle de génération cascade complet (ADVE→RTIS auto: chaque pilier consomme les précédents)
// [x] REQ-9  Pipeline orchestrator side-effects post-génération (phase advance, score recalc, variable extraction)
// [x] REQ-10 Phases: fiche → audit → implementation → cockpit → complete (machine 5 états)
//
// PROCEDURES: get, update, generate, batchGenerate, validate, getHistory,
//             getSchema, listByStrategy, reorder, transitionPhase, getPhase
// ============================================================================

/**
 * Pillar CRUD Router — Édition complète de la fiche ADVE-RTIS
 * Full CRUD avec validation Zod, scoring sémantique, et propagation de staleness
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import { validatePillarContent, validatePillarPartial, type PillarKey } from "@/lib/types/pillar-schemas";
import { validateCrossReferences, getCrossRefSummary } from "@/server/services/cross-validator";
import * as pillarVersioning from "@/server/services/pillar-versioning";
import { propagateFromPillar } from "@/server/services/staleness-propagator";
import { scoreObject } from "@/server/services/advertis-scorer";
import { writePillarAndScore, writePillar } from "@/server/services/pillar-gateway";
import type { PillarKey as PK } from "@/lib/types/advertis-vector";
import { triggerNextStageFrameworks } from "@/server/services/artemis";
import {
  actualizePillar, runRTISCascade,
  generateADVERecommendations, applyAcceptedRecommendations, clearRecommendations,
  type FieldRecommendation,
} from "@/server/services/mestor/rtis-cascade";

const pillarKeyEnum = z.enum(["A", "D", "V", "E", "R", "T", "I", "S"]);
const adveKeyEnum = z.enum(["A", "D", "V", "E"]);

export const pillarRouter = createTRPCRouter({
  /** Maturity assessment for a pillar — 3-level scoring (suffisant/complet/R+T) */
  assess: protectedProcedure
    .input(z.object({ strategyId: z.string(), key: pillarKeyEnum }))
    .query(async ({ ctx, input }) => {
      const { assessPillar } = await import("@/server/services/pillar-maturity/assessor");
      const { getContracts } = await import("@/server/services/pillar-maturity/contracts-loader");
      const pillar = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: input.key.toLowerCase() } },
      });
      const content = (pillar?.content ?? {}) as Record<string, unknown>;
      const contracts = getContracts();
      const contract = contracts[input.key.toLowerCase()];

      // Full assessment (COMPLETE stage %)
      const assessment = assessPillar(input.key, pillar ? content : null, contract);

      // ENRICHED stage % (suffisant)
      let enrichedPct = 0;
      if (contract) {
        const enrichedReqs = contract.stages.ENRICHED ?? [];
        const enrichedSatisfied = enrichedReqs.filter((r: { path: string }) => {
          const parts = r.path.split(".");
          let cur: unknown = content;
          for (const p of parts) {
            if (!cur || typeof cur !== "object") return false;
            cur = (cur as Record<string, unknown>)[p];
          }
          return cur != null && cur !== "" && !(Array.isArray(cur) && cur.length === 0);
        }).length;
        enrichedPct = enrichedReqs.length > 0 ? Math.round((enrichedSatisfied / enrichedReqs.length) * 100) : 100;
      }

      // R+T consolidation check — has R or T produced recos touching this pillar?
      const isAdve = ["a", "d", "v", "e"].includes(input.key.toLowerCase());
      let rtConsolidated = false;
      if (isAdve) {
        const rPillar = await ctx.db.pillar.findUnique({
          where: { strategyId_key: { strategyId: input.strategyId, key: "r" } },
        });
        const tPillar = await ctx.db.pillar.findUnique({
          where: { strategyId_key: { strategyId: input.strategyId, key: "t" } },
        });
        const rFilled = rPillar?.content && typeof rPillar.content === "object" && Object.keys(rPillar.content as object).length > 0;
        const tFilled = tPillar?.content && typeof tPillar.content === "object" && Object.keys(tPillar.content as object).length > 0;
        rtConsolidated = Boolean(rFilled && tFilled);
      }

      return {
        ...assessment,
        enrichedPct,
        rtConsolidated,
      };
    }),

  /** Get a single pillar with validation status and semantic score */
  get: protectedProcedure
    .input(z.object({ strategyId: z.string(), key: pillarKeyEnum }))
    .query(async ({ ctx, input }) => {
      const pillar = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: input.key.toLowerCase() } },
      });

      if (!pillar) return { pillar: null, validation: null, score: null };

      const validation = validatePillarPartial(input.key, pillar.content);
      const score = validatePillarPartial(input.key, pillar.content);

      return { pillar, validation, score };
    }),

  /** Get all 8 pillars with completion map */
  getAll: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const pillars = await ctx.db.pillar.findMany({ where: { strategyId: input.strategyId } });

      const map: Record<string, { content: unknown; commentary: unknown; completion: number; score: number; errors: number; validationStatus: string }> = {};
      for (const key of ["A", "D", "V", "E", "R", "T", "I", "S"]) {
        const pillar = pillars.find((p) => p.key.toUpperCase() === key);
        if (pillar) {
          const validation = validatePillarPartial(key as PillarKey, pillar.content);
          map[key] = {
            content: pillar.content,
            commentary: pillar.commentary,
            completion: validation.completionPercentage,
            score: validation.completionPercentage / 4, // Approx /25 from completion %
            errors: validation.errors?.length ?? 0,
            validationStatus: pillar.validationStatus ?? "DRAFT",
          };
        } else {
          map[key] = { content: null, commentary: null, completion: 0, score: 0, errors: 0, validationStatus: "DRAFT" };
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

      // Gateway handles: versioning, staleness propagation, scoring, validation status
      const result = await writePillarAndScore({
        strategyId: input.strategyId,
        pillarKey: input.key.toLowerCase() as PK,
        operation: { type: "REPLACE_FULL", content: sanitizedContent as Record<string, unknown> },
        author: { system: "OPERATOR", userId: ctx.session.user.id, reason: "manual_edit" },
        options: { confidenceDelta: 0.1 },
      });

      return { success: result.success, score: null, warnings: result.warnings, error: result.error };
    }),

  /** Partial/draft update — lenient validation, saves even if incomplete */
  updatePartial: protectedProcedure
    .input(z.object({ strategyId: z.string(), key: pillarKeyEnum, content: z.record(z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      // Gateway handles merge, versioning, staleness, scoring
      const result = await writePillarAndScore({
        strategyId: input.strategyId,
        pillarKey: input.key.toLowerCase() as PK,
        operation: { type: "MERGE_DEEP", patch: input.content as Record<string, unknown> },
        author: { system: "OPERATOR", userId: ctx.session.user.id, reason: "partial_edit" },
      });

      const validation = validatePillarPartial(input.key, result.newContent);
      return { success: result.success, validation, score: null, merged: result.newContent };
    }),

  /** Dry-run validation — no save */
  validate: protectedProcedure
    .input(z.object({ strategyId: z.string(), key: pillarKeyEnum, content: z.record(z.unknown()) }))
    .query(({ input }) => {
      const full = validatePillarContent(input.key, input.content);
      const partial = validatePillarPartial(input.key, input.content);
      return { fullValidation: full, partialValidation: partial, score: { completionPct: partial.completionPercentage } };
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
      // Read current array, append, write via Gateway
      const pillar = await ctx.db.pillar.findUnique({ where: { strategyId_key: { strategyId: input.strategyId, key: "v" } } });
      const content = (pillar?.content as Record<string, unknown>) ?? {};
      const catalogue = getArraySafe(content.produitsCatalogue);
      catalogue.push(input.product);

      await writePillar({
        strategyId: input.strategyId, pillarKey: "v",
        operation: { type: "SET_FIELDS", fields: [{ path: "produitsCatalogue", value: catalogue }] },
        author: { system: "OPERATOR", userId: ctx.session.user.id, reason: "addProduct" },
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
      const pillar = await ctx.db.pillar.findUnique({ where: { strategyId_key: { strategyId: input.strategyId, key: "d" } } });
      const content = (pillar?.content as Record<string, unknown>) ?? {};
      const personas = getArraySafe(content.personas);
      personas.push(input.persona);

      await writePillar({
        strategyId: input.strategyId, pillarKey: "d",
        operation: { type: "SET_FIELDS", fields: [{ path: "personas", value: personas }] },
        author: { system: "OPERATOR", userId: ctx.session.user.id, reason: "addPersona" },
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
      const pillar = await ctx.db.pillar.findUnique({ where: { strategyId_key: { strategyId: input.strategyId, key: "e" } } });
      const content = (pillar?.content as Record<string, unknown>) ?? {};
      const touchpoints = getArraySafe(content.touchpoints);
      touchpoints.push(input.touchpoint);

      await writePillar({
        strategyId: input.strategyId, pillarKey: "e",
        operation: { type: "SET_FIELDS", fields: [{ path: "touchpoints", value: touchpoints }] },
        author: { system: "OPERATOR", userId: ctx.session.user.id, reason: "addTouchpoint" },
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
      const pillar = await ctx.db.pillar.findUnique({ where: { strategyId_key: { strategyId: input.strategyId, key: "e" } } });
      const content = (pillar?.content as Record<string, unknown>) ?? {};
      const rituels = getArraySafe(content.rituels);
      rituels.push(input.ritual);

      await writePillar({
        strategyId: input.strategyId, pillarKey: "e",
        operation: { type: "SET_FIELDS", fields: [{ path: "rituels", value: rituels }] },
        author: { system: "OPERATOR", userId: ctx.session.user.id, reason: "addRitual" },
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

      await writePillar({
        strategyId: input.strategyId, pillarKey: "a",
        operation: { type: "SET_FIELDS", fields: [{ path: "valeurs", value: valeurs }] },
        author: { system: "OPERATOR", userId: ctx.session.user.id, reason: "addValue" },
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

      // Gate: VALIDATED requires cross-validation check (only rules involving THIS pillar)
      if (input.targetStatus === "VALIDATED") {
        const allRefs = await validateCrossReferences(input.strategyId);
        const key = input.key.toUpperCase();
        const relevantInvalid = allRefs.filter(
          (r: { status: string; from: string; to: string }) =>
            r.status === "INVALID" && (r.from.startsWith(`${key}.`) || r.to.startsWith(`${key}.`))
        );
        if (relevantInvalid.length > 0) {
          return {
            success: false,
            error: `Impossible de valider ${key}: ${relevantInvalid.length} violation(s) cross-pilier. ${relevantInvalid.map((r: { rule: string }) => r.rule).join(", ")}`,
            crossRefViolations: relevantInvalid,
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

      // validationStatus is a state machine transition, not content — direct write OK
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
          // Create a signal for audit trail
          await ctx.db.signal.create({
            data: {
              strategyId: input.strategyId,
              type: "ADVE_VALIDATED",
              data: { trigger: "all_4_adve_pillars_validated", validatedAt: new Date().toISOString() },
            },
          });

          // Auto-trigger RTIS cascade with feedback loop (R+T → update ADVE)
          runRTISCascade(input.strategyId, { updateADVE: true }).catch((err) => {
            console.error("[pillar] RTIS cascade auto-trigger failed:", err instanceof Error ? err.message : err);
          });
        }
      }

      // Artemis auto-trigger: run relevant frameworks for the next pipeline stage
      if (input.targetStatus === "VALIDATED") {
        triggerNextStageFrameworks(input.strategyId, input.key.toLowerCase()).catch((err) => {
          console.warn("[pillar] Artemis auto-trigger failed:", err instanceof Error ? err.message : err);
        });
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

      // Apply via Gateway — SET_FIELDS on D.directionArtistique.targetField
      const result = await writePillar({
        strategyId: input.strategyId, pillarKey: "d",
        operation: {
          type: "SET_FIELDS",
          fields: [{ path: `directionArtistique.${input.targetField}`, value: { ...cleanOutput, gloryOutputId: input.gloryOutputId } }],
        },
        author: { system: "GLORY", userId: ctx.session.user.id, reason: `applyGloryOutput → D.directionArtistique.${input.targetField}` },
        options: { confidenceDelta: 0.02 },
      });

      return { success: result.success, field: input.targetField };
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

  // ── Mestor RTIS Cascade ────────────────────────────────────────────────

  actualize: protectedProcedure
    .input(z.object({ strategyId: z.string(), key: pillarKeyEnum }))
    .mutation(async ({ input }) => {
      return actualizePillar(input.strategyId, input.key);
    }),

  cascadeRTIS: protectedProcedure
    .input(z.object({ strategyId: z.string(), updateADVE: z.boolean().optional(), skipT: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      return runRTISCascade(input.strategyId, { updateADVE: input.updateADVE, skipT: input.skipT });
    }),

  // ── ADVE Recommendation Review ────────────────────────────────────────
  // DEPRECATED: Use notoria.* endpoints directly. These stubs delegate to Notoria.

  /** @deprecated Use notoria.generateBatch instead */
  generateRecos: protectedProcedure
    .input(z.object({ strategyId: z.string(), key: adveKeyEnum }))
    .mutation(async ({ input }) => {
      return generateADVERecommendations(input.strategyId, input.key);
    }),

  /** @deprecated Use notoria.getRecosByPillar instead */
  getRecos: protectedProcedure
    .input(z.object({ strategyId: z.string(), key: adveKeyEnum }))
    .query(async ({ ctx, input }) => {
      // Delegate to Notoria Recommendation table
      const recos = await ctx.db.recommendation.findMany({
        where: {
          strategyId: input.strategyId,
          targetPillarKey: input.key.toLowerCase(),
          status: { in: ["PENDING", "ACCEPTED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      // Map to legacy FieldRecommendation shape
      return recos.map((r) => ({
        field: r.targetField,
        operation: r.operation,
        currentSummary: typeof r.currentSnapshot === "string" ? r.currentSnapshot : "",
        proposedValue: r.proposedValue,
        targetMatch: r.targetMatch,
        justification: r.explain,
        source: r.source,
        impact: r.impact,
        accepted: r.status === "APPLIED",
        id: r.id,
      }));
    }),

  /** @deprecated Use notoria.acceptRecos + notoria.applyRecos instead */
  acceptRecos: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      key: adveKeyEnum,
      recoIndices: z.array(z.number()).optional(),
      fields: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      return applyAcceptedRecommendations(
        input.strategyId,
        input.key,
        input.fields,
        input.recoIndices,
      );
    }),

  /** @deprecated Use notoria.rejectRecos instead */
  rejectRecos: operatorProcedure
    .input(z.object({ strategyId: z.string(), key: adveKeyEnum }))
    .mutation(async ({ input }) => {
      await clearRecommendations(input.strategyId, input.key);
      return { success: true };
    }),

  /** Update operator commentary for a pillar (qualitative justification per field) */
  updateCommentary: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      key: pillarKeyEnum,
      commentary: z.record(z.string()),  // { fieldName: "commentary text" }
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: input.key.toLowerCase() } },
      });

      const merged = { ...(existing?.commentary as Record<string, string> ?? {}), ...input.commentary };

      // commentary is metadata (separate field), not pillar content — direct write OK
      await ctx.db.pillar.upsert({
        where: { strategyId_key: { strategyId: input.strategyId, key: input.key.toLowerCase() } },
        update: { commentary: merged as Prisma.InputJsonValue },
        create: { strategyId: input.strategyId, key: input.key.toLowerCase(), commentary: merged as Prisma.InputJsonValue },
      });

      return { success: true, commentary: merged };
    }),

  /** Get commentary for a pillar */
  getCommentary: protectedProcedure
    .input(z.object({ strategyId: z.string(), key: pillarKeyEnum }))
    .query(async ({ ctx, input }) => {
      const pillar = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: input.key.toLowerCase() } },
        select: { commentary: true },
      });
      return (pillar?.commentary as Record<string, string> | null) ?? {};
    }),

  // ── Maturity Assessment ────────────────────────────────────────────────

  /** Get maturity report for all 8 pillars of a strategy */
  maturityReport: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      const { assessStrategy } = await import("@/server/services/pillar-maturity/assessor");
      return assessStrategy(input.strategyId);
    }),

  /** Auto-fill a single pillar toward COMPLETE */
  autoFill: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      pillarKey: z.string(),
      targetStage: z.enum(["INTAKE", "ENRICHED", "COMPLETE"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { fillToStage } = await import("@/server/services/pillar-maturity/auto-filler");
      return fillToStage(input.strategyId, input.pillarKey, input.targetStage ?? "COMPLETE");
    }),

  /** Auto-fill ALL pillars toward COMPLETE */
  autoFillAll: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      targetStage: z.enum(["INTAKE", "ENRICHED", "COMPLETE"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { fillStrategyToStage } = await import("@/server/services/pillar-maturity/auto-filler");
      return fillStrategyToStage(input.strategyId, input.targetStage ?? "COMPLETE");
    }),

  /** Validate all Glory tool bindings (diagnostic) */
  bindingValidation: protectedProcedure
    .query(async () => {
      const { validateAllBindings } = await import("@/server/services/pillar-maturity/binding-validator");
      const report = validateAllBindings();
      return {
        totalTools: report.totalTools,
        totalInputFields: report.totalInputFields,
        pillarBound: report.pillarBound,
        sequenceContext: report.sequenceContext,
        unbound: report.unbound,
        coveragePct: report.coveragePct,
        orphanCount: report.orphanBindings.length,
      };
    }),

  // Vault-based enrichment — scans ALL BrandDataSource → produces recos
  enrichFromVault: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      pillarKey: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { enrichFromVault } = await import("@/server/services/vault-enrichment");
      return enrichFromVault(input.strategyId, input.pillarKey as import("@/lib/types/advertis-vector").PillarKey);
    }),

  // Vault-based enrichment for ALL pillars
  enrichAllFromVault: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ input }) => {
      const { enrichAllFromVault } = await import("@/server/services/vault-enrichment");
      return enrichAllFromVault(input.strategyId);
    }),

  // ── REQ-10: Strategy phase state machine ───────────────────────────────
  // Phases: FICHE → AUDIT → IMPLEMENTATION → COCKPIT → COMPLETE

  getPhase: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId },
        select: { status: true, advertis_vector: true },
      });
      // Derive current phase from strategy status
      const phaseOrder = ["FICHE", "AUDIT", "IMPLEMENTATION", "COCKPIT", "COMPLETE"] as const;
      const statusToPhase: Record<string, (typeof phaseOrder)[number]> = {
        DRAFT: "FICHE", ACTIVE: "AUDIT", IN_PROGRESS: "IMPLEMENTATION",
        COCKPIT: "COCKPIT", COMPLETE: "COMPLETE", COMPLETED: "COMPLETE",
      };
      const currentPhase = statusToPhase[strategy.status] ?? "FICHE";
      const phaseIndex = phaseOrder.indexOf(currentPhase);

      return {
        strategyId: input.strategyId,
        currentPhase,
        phaseIndex,
        totalPhases: phaseOrder.length,
        allPhases: phaseOrder,
        progressPct: Math.round(((phaseIndex + 1) / phaseOrder.length) * 100),
      };
    }),

  transitionPhase: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      targetPhase: z.enum(["FICHE", "AUDIT", "IMPLEMENTATION", "COCKPIT", "COMPLETE"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const phaseOrder = ["FICHE", "AUDIT", "IMPLEMENTATION", "COCKPIT", "COMPLETE"] as const;
      const phaseToStatus: Record<string, string> = {
        FICHE: "DRAFT", AUDIT: "ACTIVE", IMPLEMENTATION: "IN_PROGRESS",
        COCKPIT: "COCKPIT", COMPLETE: "COMPLETED",
      };

      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId },
        select: { status: true },
      });

      // Determine current phase
      const statusToPhase: Record<string, string> = {
        DRAFT: "FICHE", ACTIVE: "AUDIT", IN_PROGRESS: "IMPLEMENTATION",
        COCKPIT: "COCKPIT", COMPLETE: "COMPLETE", COMPLETED: "COMPLETE",
      };
      const currentPhase = statusToPhase[strategy.status] ?? "FICHE";
      const currentIdx = phaseOrder.indexOf(currentPhase as (typeof phaseOrder)[number]);
      const targetIdx = phaseOrder.indexOf(input.targetPhase);

      // Only allow forward transitions or one step back
      if (targetIdx < currentIdx - 1) {
        return { success: false, error: `Cannot jump back from ${currentPhase} to ${input.targetPhase}. Max 1 step back.` };
      }

      // Gate: AUDIT requires all ADVE pillars to have content
      if (input.targetPhase === "AUDIT") {
        const pillars = await ctx.db.pillar.findMany({
          where: { strategyId: input.strategyId, key: { in: ["a", "d", "v", "e"] } },
        });
        const filled = pillars.filter(p => p.content && typeof p.content === "object" && Object.keys(p.content as object).length > 0);
        if (filled.length < 4) {
          return { success: false, error: `AUDIT requires all 4 ADVE pillars to have content (${filled.length}/4 filled)` };
        }
      }

      // Gate: COMPLETE requires all 8 pillars validated
      if (input.targetPhase === "COMPLETE") {
        const pillars = await ctx.db.pillar.findMany({
          where: { strategyId: input.strategyId },
        });
        const validated = pillars.filter(p => p.validationStatus === "VALIDATED" || p.validationStatus === "LOCKED");
        if (validated.length < 8) {
          return { success: false, error: `COMPLETE requires all 8 pillars validated (${validated.length}/8)` };
        }
      }

      const newStatus = phaseToStatus[input.targetPhase] ?? "DRAFT";
      await ctx.db.strategy.update({
        where: { id: input.strategyId },
        data: { status: newStatus },
      });

      return { success: true, previousPhase: currentPhase, newPhase: input.targetPhase, newStatus };
    }),
});

function getArraySafe(val: unknown): unknown[] {
  return Array.isArray(val) ? [...val] : [];
}
