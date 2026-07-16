/**
 * Mission Applications Router — candidatures aux missions ouvertes (Vague 7).
 *
 * Flux : un talent/agence CANDIDATE (PENDING) → l'opérateur DÉCIDE —
 * ACCEPTED assigne la mission (assigneeId + IN_PROGRESS) et rejette les
 * autres candidatures PENDING ; REJECTED est motivé. Remplace
 * l'auto-acceptation directe côté Creator (la mission reste un poste
 * attribué par décision, pas un premier-arrivé).
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import { db } from "@/lib/db";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

const APPLICANT_ROLES = new Set(["CREATOR", "FREELANCE", "AGENCY", "PARTNER", "ADMIN", "OPERATOR", "USER"]);

export const missionApplicationRouter = createTRPCRouter({
  /** Candidater à une mission ouverte (DRAFT). Unique par (mission, candidat). */
  submit: governedProcedure({
    kind: "APPLY_TO_MISSION",
    inputSchema: z.object({
      missionId: z.string(),
      message: z.string().max(2000).optional(),
      proposedRate: z.number().positive().optional(),
      currency: z.string().min(3).max(3).default("XAF"),
    }),
  }).mutation(async ({ input, ctx }) => {
    const user = ctx.session.user;
    if (!APPLICANT_ROLES.has(user.role ?? "")) {
      throw new Error("Seuls les talents, agences et partenaires peuvent candidater.");
    }
    const mission = await db.mission.findUnique({
      where: { id: input.missionId },
      select: { status: true, assigneeId: true, guildPublished: true },
    });
    if (!mission) throw new Error("Mission introuvable.");
    if (mission.status !== "DRAFT" || mission.assigneeId) {
      throw new Error("Cette mission n'est plus ouverte aux candidatures.");
    }
    // Audit 2026-07-16 : on ne candidate pas à une mission non publiée
    // (pré-modération ou mission interne d'une marque).
    if (!mission.guildPublished) {
      throw new Error("Cette mission n'est pas publiée sur le mur des missions.");
    }
    const talentProfile = await db.talentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    return db.missionApplication.upsert({
      where: { missionId_applicantId: { missionId: input.missionId, applicantId: user.id } },
      create: {
        missionId: input.missionId,
        applicantId: user.id,
        talentProfileId: talentProfile?.id ?? null,
        message: input.message ?? null,
        proposedRate: input.proposedRate ?? null,
        currency: input.currency,
      },
      // Re-candidater après retrait : on réarme PENDING avec le nouveau message.
      update: {
        status: "PENDING",
        message: input.message ?? null,
        proposedRate: input.proposedRate ?? null,
        currency: input.currency,
        decidedBy: null,
        decidedAt: null,
        decisionNote: null,
      },
    });
  }),

  /** Retirer sa candidature (PENDING uniquement). */
  withdraw: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const app = await db.missionApplication.findUnique({ where: { id: input.applicationId } });
      if (!app || app.applicantId !== ctx.session.user.id) throw new Error("Candidature introuvable.");
      if (app.status !== "PENDING") throw new Error(`Candidature déjà ${app.status}.`);
      return db.missionApplication.update({
        where: { id: app.id },
        data: { status: "WITHDRAWN" },
      });
    }),

  /** Mes candidatures (talent/agence). */
  listMine: protectedProcedure.query(({ ctx }) =>
    db.missionApplication.findMany({
      where: { applicantId: ctx.session.user.id },
      include: {
        mission: { select: { id: true, title: true, status: true, budget: true, slaDeadline: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ),

  /** Candidatures d'une mission (revue opérateur/agence). */
  listForMission: operatorProcedure
    .input(z.object({ missionId: z.string() }))
    .query(({ input }) =>
      db.missionApplication.findMany({
        where: { missionId: input.missionId },
        include: {
          applicant: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      }),
    ),

  /** File globale des candidatures PENDING (console). */
  listPending: operatorProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
    .query(({ input }) =>
      db.missionApplication.findMany({
        where: { status: "PENDING" },
        include: {
          applicant: { select: { id: true, name: true, email: true, role: true } },
          mission: { select: { id: true, title: true, status: true, budget: true } },
        },
        orderBy: { createdAt: "asc" },
        take: input?.limit ?? 50,
      }),
    ),

  /**
   * Décision opérateur. ACCEPTED : assigne la mission (assigneeId +
   * IN_PROGRESS) et rejette les autres PENDING de la mission, motif tracé.
   */
  decide: governedProcedure({
    kind: "DECIDE_MISSION_APPLICATION",
    requireOperator: true,
    inputSchema: z.object({
      applicationId: z.string(),
      decision: z.enum(["ACCEPTED", "REJECTED"]),
      note: z.string().max(1000).optional(),
    }),
  }).mutation(async ({ input, ctx }) => {
    const app = await db.missionApplication.findUnique({
      where: { id: input.applicationId },
      include: { mission: { select: { id: true, status: true, assigneeId: true } } },
    });
    if (!app) throw new Error("Candidature introuvable.");
    if (app.status !== "PENDING") throw new Error(`Candidature déjà ${app.status}.`);

    const deciderId = ctx.session.user.id;
    const now = new Date();

    if (input.decision === "REJECTED") {
      return db.missionApplication.update({
        where: { id: app.id },
        data: { status: "REJECTED", decidedBy: deciderId, decidedAt: now, decisionNote: input.note ?? null },
      });
    }

    // ACCEPTED — la mission doit encore être attribuable.
    if (app.mission.assigneeId || app.mission.status !== "DRAFT") {
      throw new Error("La mission a déjà été attribuée.");
    }
    const [accepted] = await db.$transaction([
      db.missionApplication.update({
        where: { id: app.id },
        data: { status: "ACCEPTED", decidedBy: deciderId, decidedAt: now, decisionNote: input.note ?? null },
      }),
      db.mission.update({
        where: { id: app.mission.id },
        data: { assigneeId: app.applicantId, status: "IN_PROGRESS" },
      }),
      db.missionApplication.updateMany({
        where: { missionId: app.mission.id, status: "PENDING", id: { not: app.id } },
        data: {
          status: "REJECTED",
          decidedBy: deciderId,
          decidedAt: now,
          decisionNote: "Mission attribuée à un autre candidat.",
        },
      }),
    ]);
    return accepted;
  }),
});
