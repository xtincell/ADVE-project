/**
 * Manifest — Imhotep (Crew Programs — matching, composition, tier, QC, training).
 *
 * 6ème Neter actif (ADR-0010 — promu de pré-réservé à actif). Sous-système APOGEE
 * = Crew Programs (Ground Tier). Téléologie : matching basé sur devotion-potential.
 *
 * Cf. PANTHEON.md §2.6, ADR-0010.
 */

import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";
import { MANIPULATION_MODES } from "@/server/services/ptah/types";

export const manifest = defineManifest({
  service: "imhotep",
  // Mestor reste dispatcher unique. BRAINS const inclut "IMHOTEP" pour les
  // sub-services Crew Programs auto-gouvernés.
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: [
    "IMHOTEP_MATCH_CREATOR",
    "IMHOTEP_COMPOSE_TEAM",
    "IMHOTEP_EVALUATE_TIER",
    "IMHOTEP_ROUTE_QC",
    "IMHOTEP_RECOMMEND_TRAINING",
  ],
  emits: [
    "TEAM_COMPOSED",
    "CREATOR_TIER_PROMOTED",
    "QC_VERDICT_READY",
  ],
  capabilities: [
    {
      name: "matchCreator",
      inputSchema: z.object({
        missionId: z.string(),
        topN: z.number().int().min(1).max(20).optional(),
      }),
      outputSchema: z.object({
        missionId: z.string(),
        candidates: z.array(
          z.object({
            talentProfileId: z.string(),
            userId: z.string(),
            displayName: z.string(),
            tier: z.string(),
            matchScore: z.number(),
            devotionInSector: z.number(),
            manipulationFit: z.boolean(),
            reasons: z.array(z.string()),
          }),
        ),
        rationale: z.string(),
      }),
      sideEffects: ["DB_READ"],
      qualityTier: "A",
      latencyBudgetMs: 1500,
      idempotent: true,
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 2,
    },
    {
      name: "composeTeam",
      inputSchema: z.object({
        campaignId: z.string().optional(),
        missionId: z.string().optional(),
        buckets: z.array(z.string()).min(1),
        manipulationModes: z.array(
          z.enum(MANIPULATION_MODES as readonly [string, ...string[]]),
        ).min(1),
      }),
      outputSchema: z.object({
        composition: z.array(
          z.object({
            bucket: z.string(),
            manipulationMode: z.string(),
            candidate: z.object({
              talentProfileId: z.string(),
              userId: z.string(),
              displayName: z.string(),
              tier: z.string(),
              matchScore: z.number(),
              devotionInSector: z.number(),
              manipulationFit: z.boolean(),
              reasons: z.array(z.string()),
            }),
          }),
        ),
        cohesionScore: z.number(),
        warnings: z.array(z.string()),
      }),
      sideEffects: ["DB_READ"],
      qualityTier: "A",
      latencyBudgetMs: 3000,
      idempotent: true,
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 2,
    },
    {
      name: "evaluateTier",
      inputSchema: z.object({ talentProfileId: z.string() }),
      outputSchema: z.object({
        talentProfileId: z.string(),
        currentTier: z.string(),
        recommendedTier: z.string(),
        promote: z.boolean(),
        reasons: z.array(z.string()),
        metrics: z.object({
          avgScore: z.number(),
          firstPassRate: z.number(),
          totalMissions: z.number(),
        }),
      }),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 1000,
      idempotent: true,
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 2,
    },
    {
      name: "routeQc",
      inputSchema: z.object({
        deliverableId: z.string(),
        preferredType: z.enum(["PEER", "FIXER", "CLIENT"]).optional(),
      }),
      outputSchema: z.object({
        deliverableId: z.string(),
        reviewerId: z.string(),
        reviewType: z.enum(["PEER", "FIXER", "CLIENT"]),
        rationale: z.string(),
      }),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      latencyBudgetMs: 1500,
      idempotent: false,
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 2,
    },
    {
      name: "recommendTraining",
      inputSchema: z.object({ talentProfileId: z.string() }),
      outputSchema: z.object({
        talentProfileId: z.string(),
        recommendations: z.array(
          z.object({
            courseId: z.string(),
            courseTitle: z.string(),
            pillarFocus: z.string().nullable(),
            reason: z.string(),
            expectedScoreLift: z.number(),
          }),
        ),
      }),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 1200,
      idempotent: true,
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 2,
    },
  ],
  dependencies: [
    "talent-engine",
    "matching-engine",
    "team-allocator",
    "qc-router",
    "tier-evaluator",
    "seshat",
  ],
  docs: {
    summary:
      "Imhotep — 6ème Neter actif (Crew Programs). Matching basé sur devotion-potential (footprint sectoriel + manipulation strengths), pas CV brut. Pondère les outputs des L3 services (talent-engine, matching-engine, team-allocator, qc-router, tier-evaluator) avec la téléologie ADR-0010 §3.",
  },
  missionContribution: "CHAIN_VIA:artemis",
  missionStep: 2,
});
