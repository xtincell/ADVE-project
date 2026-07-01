/**
 * Imhotep tRPC router — Phase 14 (ADR-0019, full activation Crew Programs).
 *
 * Procédures :
 *   - draftCrewProgram     : draft programme crew (mutation)
 *   - matchTalent          : top N candidates (query)
 *   - assembleCrew         : assemblage équipe (mutation)
 *   - evaluateTier         : évaluation tier promotion (query)
 *   - enrollFormation      : enroll dans Course Académie (mutation)
 *   - certifyTalent        : délivre TalentCertification (mutation)
 *   - qcDeliverable        : route QC d'un MissionDeliverable (mutation)
 *   - recommendFormation   : top 3 cours pour skill gap (query)
 *   - dashboard            : KPIs agrégés Imhotep (query)
 *
 * Toutes les mutations passent par les Intent kinds Imhotep — Mestor reste
 * dispatcher unique (Pilier 1 — pas de bypass governance).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, operatorProcedure, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import * as imhotep from "@/server/services/imhotep";
import { emitIntentTyped } from "@/server/services/mestor/intents";

/* lafusee:governed-active — Phase 0 migration complete v6.18.17 (Sprint 3) : 5 mutations (draft/assemble/enroll/certify/qc) traversent mestor.emitIntent({ kind: "IMHOTEP_*" }) via emitIntentTyped helper. Imports imhotep.* sont read-only utilities + types pour query handlers + Awaited<ReturnType<>> casts dans mutations. */

async function resolveOperatorId(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { operatorId: true },
  });
  if (!user?.operatorId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "User has no operatorId" });
  }
  return user.operatorId;
}

export const imhotepRouter = createTRPCRouter({
  // ── Mutations ───────────────────────────────────────────────────

  // Phase 0 POC migration v6.18.16 (Sprint 2.5) — emitIntent typed wrapper.
  // Le contrat client tRPC est préservé via cast Awaited<ReturnType<>>.
  // Pattern réutilisable pour les 7 autres imhotep mutations + autres routers.
  draftCrewProgram: operatorProcedure
    .input(z.object({ strategyId: z.string(), sector: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return emitIntentTyped<Awaited<ReturnType<typeof imhotep.draftCrewProgram>>>(
        {
          kind: "IMHOTEP_DRAFT_CREW_PROGRAM",
          strategyId: input.strategyId,
          operatorId,
          sector: input.sector,
        },
        { caller: "imhotep-router:draftCrewProgram" },
      );
    }),

  assembleCrew: operatorProcedure
    .input(
      z.object({
        missionId: z.string(),
        rolesRequired: z.array(z.string()).optional(),
        budgetCapUsd: z.number().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return emitIntentTyped<Awaited<ReturnType<typeof imhotep.assembleCrew>>>(
        {
          kind: "IMHOTEP_ASSEMBLE_CREW",
          strategyId: "(inferred-from-mission)",
          operatorId,
          missionId: input.missionId,
          rolesRequired: input.rolesRequired,
          budgetCapUsd: input.budgetCapUsd,
        },
        { caller: "imhotep-router:assembleCrew" },
      );
    }),

  enrollFormation: operatorProcedure
    .input(z.object({ userId: z.string(), courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return emitIntentTyped<Awaited<ReturnType<typeof imhotep.enrollFormation>>>(
        {
          kind: "IMHOTEP_ENROLL_FORMATION",
          strategyId: "(global)",
          operatorId,
          userId: input.userId,
          courseId: input.courseId,
        },
        { caller: "imhotep-router:enrollFormation" },
      );
    }),

  certifyTalent: operatorProcedure
    .input(
      z.object({
        talentProfileId: z.string(),
        certificationName: z.string().min(1),
        category: z.string().min(1),
        expiresAt: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return emitIntentTyped<Awaited<ReturnType<typeof imhotep.certifyTalent>>>(
        {
          kind: "IMHOTEP_CERTIFY_TALENT",
          strategyId: "(global)",
          operatorId,
          ...input,
        },
        { caller: "imhotep-router:certifyTalent" },
      );
    }),

  qcDeliverable: operatorProcedure
    .input(z.object({ deliverableId: z.string(), reviewerId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const operatorId = await resolveOperatorId(ctx.session.user.id);
      return emitIntentTyped<Awaited<ReturnType<typeof imhotep.qcDeliverable>>>(
        {
          kind: "IMHOTEP_QC_DELIVERABLE",
          strategyId: "(inferred-from-deliverable)",
          operatorId,
          deliverableId: input.deliverableId,
          reviewerId: input.reviewerId,
        },
        { caller: "imhotep-router:qcDeliverable" },
      );
    }),

  // ── Queries ─────────────────────────────────────────────────────

  matchTalent: protectedProcedure
    .input(
      z.object({
        missionId: z.string(),
        minMatchScore: z.number().min(0).max(1).optional(),
        limit: z.number().int().positive().max(20).optional(),
      }),
    )
    .query(async ({ input }) => imhotep.matchTalentToMission(input)),

  evaluateTier: protectedProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .query(async ({ input }) => imhotep.evaluateTier(input)),

  recommendFormation: protectedProcedure
    .input(z.object({ userId: z.string(), skillGap: z.string().optional() }))
    .query(async ({ input }) => imhotep.recommendFormation(input)),

  /** Imhotep dashboard — KPIs agrégés (talent count, formation enrollments, QC backlog). */
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const operatorId = await resolveOperatorId(ctx.session.user.id);
    const [
      totalTalents,
      activeMissions,
      pendingReviews,
      activeEnrollments,
      certificationsLast30d,
    ] = await Promise.all([
      db.talentProfile.count(),
      db.mission.count({ where: { status: { in: ["ACTIVE", "IN_PROGRESS"] } } }),
      // QC backlog = MissionDeliverable en attente de review (status PENDING).
      // QualityReview a verdict obligatoire (enum ACCEPTED|REVISION|REJECTED|ESCALATED),
      // pas de notion de "pending" sur le review lui-même.
      db.missionDeliverable.count({ where: { status: "PENDING" } }),
      db.enrollment.count({ where: { status: "ENROLLED" } }),
      db.talentCertification.count({
        where: {
          issuedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);
    return {
      operatorId,
      totalTalents,
      activeMissions,
      pendingReviews,
      activeEnrollments,
      certificationsLast30d,
      generatedAt: new Date().toISOString(),
    };
  }),
});
