/**
 * Manifest — Imhotep (Crew Programs Ground #6) — full activation Phase 14.
 *
 * 6ème Neter actif (ADR-0019, supersedes ADR-0017). Sous-système APOGEE = Crew Programs (Ground Tier).
 *
 * Imhotep orchestre matching-engine, talent-engine, team-allocator, tier-evaluator, qc-router
 * sous gouvernance unifiée. Mestor reste dispatcher unique : Mestor → Imhotep → satellite.
 *
 * Cf. PANTHEON.md §2.6, ADR-0010 + ADR-0019.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const StringId = z.string().min(1);

export const manifest = defineManifest({
  service: "imhotep",
  // Phase 13 R5 a établi le pattern : Imhotep/Anubis utilisent leur propre
  // Neter comme governor (cf. intent-kinds.ts:109). Mestor reste dispatcher
  // unique (mestor.emitIntent), mais le governor narratif désigne le Neter
  // sous tutelle. Aligned avec IMHOTEP_DRAFT_CREW_PROGRAM existant.
  governor: "IMHOTEP",
  version: "1.0.0",
  acceptsIntents: [
    "IMHOTEP_DRAFT_CREW_PROGRAM",
    "IMHOTEP_MATCH_TALENT_TO_MISSION",
    "IMHOTEP_ASSEMBLE_CREW",
    "IMHOTEP_EVALUATE_TIER",
    "IMHOTEP_ENROLL_FORMATION",
    "IMHOTEP_CERTIFY_TALENT",
    "IMHOTEP_QC_DELIVERABLE",
    "IMHOTEP_RECOMMEND_FORMATION",
  ],
  emits: [
    "CREW_ASSEMBLED",
    "TIER_PROMOTED",
    "TIER_DEMOTED",
    "TALENT_CERTIFIED",
    "FORMATION_ENROLLED",
    "QC_ROUTED",
  ],
  capabilities: [
    {
      name: "draftCrewProgram",
      inputSchema: z.object({
        strategyId: StringId,
        sector: z.string().optional(),
      }),
      outputSchema: z.object({
        brief: z.string(),
        status: z.enum(["DRAFT", "DORMANT_PRE_RESERVED"]),
        rolesRequired: z.array(z.string()),
        estimatedBudgetUsd: z.number().optional(),
        adrRefs: z.array(z.string()),
        createdAt: z.string(),
      }),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 2000,
      idempotent: true,
    },
    {
      name: "matchTalentToMission",
      inputSchema: z.object({
        missionId: StringId,
        minMatchScore: z.number().min(0).max(1).optional(),
        limit: z.number().int().positive().max(20).optional(),
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
            matchReasons: z.array(z.string()),
          }),
        ),
        recommendedTalentProfileId: z.string().nullable(),
      }),
      sideEffects: ["DB_READ"],
      qualityTier: "A",
      latencyBudgetMs: 3000,
      idempotent: true,
    },
    {
      name: "assembleCrew",
      inputSchema: z.object({
        missionId: StringId,
        rolesRequired: z.array(z.string()).optional(),
        budgetCapUsd: z.number().positive().optional(),
      }),
      outputSchema: z.object({
        missionId: z.string(),
        members: z.array(
          z.object({
            role: z.string(),
            userId: z.string(),
            displayName: z.string(),
            tier: z.string(),
            currentUtilization: z.number(),
            matchScore: z.number(),
          }),
        ),
        estimatedCostUsd: z.number(),
        unfilled: z.array(z.object({ role: z.string(), reason: z.string() })),
      }),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      qualityTier: "A",
      latencyBudgetMs: 5000,
      idempotent: false,
    },
    {
      name: "evaluateTier",
      inputSchema: z.object({ talentProfileId: StringId }),
      outputSchema: z.object({
        talentProfileId: z.string(),
        currentTier: z.string(),
        recommendedTier: z.string(),
        action: z.enum(["PROMOTE", "DEMOTE", "HOLD"]),
        criteria: z.record(z.string(), z.number()),
        rationale: z.string(),
      }),
      sideEffects: ["DB_READ"],
      qualityTier: "A",
      latencyBudgetMs: 2000,
      idempotent: true,
    },
    {
      name: "enrollFormation",
      inputSchema: z.object({
        userId: StringId,
        courseId: StringId,
      }),
      outputSchema: z.object({
        enrollmentId: z.string(),
        status: z.enum(["ENROLLED", "ALREADY_ENROLLED", "WAITLISTED"]),
        startedAt: z.string(),
      }),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      qualityTier: "B",
      latencyBudgetMs: 1500,
      idempotent: true,
    },
    {
      name: "certifyTalent",
      inputSchema: z.object({
        talentProfileId: StringId,
        certificationName: z.string().min(1),
        category: z.string().min(1),
        expiresAt: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
      outputSchema: z.object({
        certificationId: z.string(),
        talentProfileId: z.string(),
        name: z.string(),
        issuedAt: z.string(),
      }),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      qualityTier: "A",
      latencyBudgetMs: 1000,
      idempotent: false,
    },
    {
      name: "qcDeliverable",
      inputSchema: z.object({
        deliverableId: StringId,
        reviewerId: z.string().optional(),
      }),
      outputSchema: z.object({
        deliverableId: z.string(),
        routedTo: z.string(),
        reviewId: z.string().nullable(),
        automatedScore: z.number().optional(),
      }),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      qualityTier: "A",
      latencyBudgetMs: 3000,
      idempotent: false,
    },
    {
      name: "recommendFormation",
      inputSchema: z.object({
        userId: StringId,
        skillGap: z.string().optional(),
      }),
      outputSchema: z.object({
        userId: z.string(),
        recommendedCourses: z.array(
          z.object({
            courseId: z.string(),
            title: z.string(),
            rationale: z.string(),
            estimatedDurationMin: z.number(),
          }),
        ),
      }),
      sideEffects: ["DB_READ", "LLM_CALL"],
      qualityTier: "A",
      latencyBudgetMs: 5000,
      idempotent: true,
    },
  ],
  dependencies: [
    "matching-engine",
    "talent-engine",
    "team-allocator",
    "tier-evaluator",
    "qc-router",
    "financial-brain",
  ],
  docs: {
    summary:
      "Master of Crew Programs (Ground Tier #6). Orchestre matching talent ↔ mission, composition équipes, évaluation tier, formation Académie, qc-routing. Wrappe les 5 services satellites existants sous gouvernance unifiée Mestor → Imhotep.",
  },
  // Crew Programs alimente la mission via matching qualité × disponibilité.
  // Une bonne équipe livre des assets qui convertissent en superfans.
  missionContribution: "CHAIN_VIA:matching-engine",
  missionStep: 1,
});
