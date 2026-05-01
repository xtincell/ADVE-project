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

  draftCrewProgram: operatorProcedure
    .input(z.object({ strategyId: z.string(), sector: z.string().optional() }))
    .mutation(async ({ input }) => imhotep.draftCrewProgram(input)),

  assembleCrew: operatorProcedure
    .input(
      z.object({
        missionId: z.string(),
        rolesRequired: z.array(z.string()).optional(),
        budgetCapUsd: z.number().positive().optional(),
      }),
    )
    .mutation(async ({ input }) => imhotep.assembleCrew(input)),

  enrollFormation: operatorProcedure
    .input(z.object({ userId: z.string(), courseId: z.string() }))
    .mutation(async ({ input }) => imhotep.enrollFormation(input)),

  certifyTalent: operatorProcedure
    .input(
      z.object({
        talentProfileId: z.string(),
        certificationName: z.string().min(1),
        category: z.string().min(1),
        expiresAt: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input }) => imhotep.certifyTalent(input)),

  qcDeliverable: operatorProcedure
    .input(z.object({ deliverableId: z.string(), reviewerId: z.string().optional() }))
    .mutation(async ({ input }) => imhotep.qcDeliverable(input)),

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
