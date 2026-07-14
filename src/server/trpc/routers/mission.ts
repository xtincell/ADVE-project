import { z } from "zod";
import type { Prisma, GuildTier } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { evaluateCreator } from "@/server/services/tier-evaluator";
import * as feedbackLoop from "@/server/services/feedback-loop";
import * as knowledgeCapture from "@/server/services/knowledge-capture";
import * as matchingEngine from "@/server/services/matching-engine";
import * as commissionEngine from "@/server/services/commission-engine";
import * as auditTrail from "@/server/services/audit-trail";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { assertCampaignHasBrief } from "@/server/services/campaign-manager/brief-gate";
import * as cm from "@/server/services/campaign-manager";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import { TRPCError } from "@trpc/server";
/* lafusee:governed-active */

/** Founder-safe ownership guard (ADR-0144) — résout mission/activité → marque. */
async function enforceStrategyAccess(
  ctx: { session: { user: { id: string; role: string; operatorId?: string | null } } },
  strategyId: string,
) {
  const ok = await canAccessStrategy(strategyId, {
    operatorId: ctx.session.user.operatorId ?? null,
    userId: ctx.session.user.id,
    role: ctx.session.user.role,
  });
  if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé : cette marque appartient à un autre compte." });
}

export const missionRouter = createTRPCRouter({
  create: governedProcedure({

    kind: "LEGACY_MISSION_CREATE",

    inputSchema: z.object({
      title: z.string().min(1),
      strategyId: z.string(),
      campaignId: z.string().optional(),
      driverId: z.string().optional(),
      mode: z.enum(["DISPATCH", "COLLABORATIF"]).optional(),
      description: z.string().optional(),
      priority: z.number().optional(),
      budget: z.number().optional(),
      slaDeadline: z.string().optional(),
      assigneeId: z.string().optional(),
      briefData: z.record(z.string(), z.unknown()).optional(),
      advertis_vector: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    }),

    caller: "mission:create",

  })
    .mutation(async ({ ctx, input }) => {
      const { advertis_vector, briefData, slaDeadline, ...rest } = input;

      // ADR-0049 — brief mandatory gate (campaign-scoped missions only)
      if (input.campaignId) {
        await assertCampaignHasBrief(input.campaignId, ctx.db);
      }

      const mission = await ctx.db.mission.create({
        data: {
          ...rest,
          advertis_vector: advertis_vector as Prisma.InputJsonValue,
          briefData: briefData as Prisma.InputJsonValue,
          ...(slaDeadline ? { slaDeadline: new Date(slaDeadline) } : {}),
        },
      });

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "CREATE",
        entityType: "Mission",
        entityId: mission.id,
        newValue: { title: input.title, strategyId: input.strategyId, campaignId: input.campaignId },
      }).catch((err) => { console.warn("[audit-trail] mission create log failed:", err instanceof Error ? err.message : err); });

      return mission;
    }),

  update: governedProcedure({


    kind: "LEGACY_MISSION_UPDATE",


    inputSchema: z.object({
      id: z.string(),
      title: z.string().optional(),
      status: z.string().optional(),
      mode: z.enum(["DISPATCH", "COLLABORATIF"]).optional(),
      driverId: z.string().optional(),
      description: z.string().optional(),
      priority: z.number().optional(),
      budget: z.number().optional(),
      slaDeadline: z.string().optional(),
      briefData: z.record(z.string(), z.unknown()).optional(),
    }),


    caller: "mission:update",


  })
    .mutation(async ({ ctx, input }) => {
      const { id, briefData, slaDeadline, ...data } = input;
      const previous = await ctx.db.mission.findUniqueOrThrow({ where: { id }, include: { strategy: true } });
      const updated = await ctx.db.mission.update({
        where: { id },
        data: {
          ...data,
          ...(briefData !== undefined ? { briefData: briefData as Prisma.InputJsonValue } : {}),
          ...(slaDeadline ? { slaDeadline: new Date(slaDeadline) } : {}),
        },
      });

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "UPDATE",
        entityType: "Mission",
        entityId: id,
        oldValue: { status: previous.status, driverId: previous.driverId },
        newValue: { ...data },
      }).catch((err) => { console.warn("[audit-trail] mission update log failed:", err instanceof Error ? err.message : err); });

      // If mission just completed → trigger side effects chain
      if (input.status === "COMPLETED" && previous.status !== "COMPLETED") {
        // 1. Auto-trigger tier evaluation for the assigned creator
        if (updated.assigneeId) {
          evaluateCreator(updated.assigneeId).catch((err) => { console.warn("[tier-evaluator] creator evaluation failed:", err instanceof Error ? err.message : err); });

          // 1b. Chantier 6 — Recalculate talent ADVE vector
          import("@/server/services/talent-engine").then(({ recalculateTalentVector }) => {
            recalculateTalentVector(updated.assigneeId!).catch((err) => {
              console.warn("[talent-engine] vector recalc failed:", err instanceof Error ? err.message : err);
            });
          }).catch(() => {});
        }

        // 2. Capture knowledge from mission outcome
        knowledgeCapture.captureEvent("MISSION_OUTCOME", {
          data: { missionId: id, status: "COMPLETED", driverId: updated.driverId },
          sourceId: updated.strategyId,
        }).catch((err) => { console.warn("[knowledge-capture] mission outcome capture failed:", err instanceof Error ? err.message : err); });

        // 3. Auto-calculate commission for the assigned talent
        if (updated.assigneeId && (updated.budget ?? 0) > 0) {
          commissionEngine.calculate(id).then(async (result) => {
            // Persist the commission record
            const commission = await ctx.db.commission.create({
              data: {
                missionId: id,
                talentId: updated.assigneeId!,
                grossAmount: result.grossAmount,
                commissionRate: result.commissionRate,
                commissionAmount: result.commissionAmount,
                netAmount: result.netAmount,
                currency: "XAF",
                status: "PENDING",
                tierAtTime: result.tierAtTime,
                operatorFee: result.operatorFee,
              },
            });
            console.log(`[commission-engine] Commission created for mission ${id}: ${result.netAmount} XAF net`);

            // Met le net du talent sous séquestre → file d'arbitrage UPgraders
            // (ADR-0116). Le paiement reste asynchrone, libéré manuellement.
            const { holdEscrowForMission } = await import("@/server/services/escrow-arbitration");
            await holdEscrowForMission({
              missionId: id,
              commissionId: commission.id,
              amount: result.netAmount,
              currency: "XAF",
              conditions: ["Livrable accepté en QC", "Aucun litige ouvert"],
            }).catch((err) => { console.warn("[escrow] auto-hold failed:", err instanceof Error ? err.message : err); });
          }).catch((err) => { console.warn("[commission-engine] auto-commission failed:", err instanceof Error ? err.message : err); });
        }

        // 4. Feed the feedback loop — create signal then process it
        ctx.db.signal.create({
          data: {
            strategyId: updated.strategyId,
            type: "INTERNAL",
            data: {
              source: "mission-completion",
              missionId: id,
              missionTitle: updated.title,
              driverId: updated.driverId,
              status: "COMPLETED",
              completedAt: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        }).then(async (signal) => {
          await feedbackLoop.processSignal(signal.id);
          console.log(`[feedback-loop] Signal ${signal.id} processed for mission ${id}`);
        }).catch((err) => { console.warn("[feedback-loop] mission completion signal failed:", err instanceof Error ? err.message : err); });
      }

      return updated;
    }),

  /**
   * ADR-0144 — Le fondateur LANCE sa mission (DRAFT → IN_PROGRESS). Founder-safe
   * (governedProcedure sans requireOperator) + ownership-scopé. Idempotent : si
   * déjà lancée/terminée, renvoie l'état courant sans régression (Loi 1).
   */
  start: governedProcedure({
    kind: "START_CAMPAIGN_MISSION",
    inputSchema: z.object({ missionId: z.string() }),
    caller: "mission:start",
  })
    .mutation(async ({ ctx, input }) => {
      const mission = await ctx.db.mission.findUniqueOrThrow({
        where: { id: input.missionId },
        select: { id: true, strategyId: true, status: true, title: true },
      });
      await enforceStrategyAccess(ctx, mission.strategyId);
      if (mission.status !== "DRAFT") return mission; // déjà lancée/close — no-op honnête
      const updated = await ctx.db.mission.update({
        where: { id: mission.id },
        data: { status: "IN_PROGRESS" },
      });
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "UPDATE",
        entityType: "Mission",
        entityId: mission.id,
        oldValue: { status: "DRAFT" },
        newValue: { status: "IN_PROGRESS" },
      }).catch((err) => { console.warn("[audit-trail] mission start log failed:", err instanceof Error ? err.message : err); });
      return updated;
    }),

  /** Get matched/ranked missions for a creator — delegates to matching-engine service */
  listForCreator: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const talent = await ctx.db.talentProfile.findUnique({ where: { userId } });
      if (!talent) return [];

      // Get available missions (unassigned DRAFT)
      const missions = await ctx.db.mission.findMany({
        where: { status: "DRAFT", assigneeId: null },
        include: { driver: true, strategy: { select: { name: true, advertis_vector: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      // Use matching-engine service for each mission to get the talent's match score
      const ranked = await Promise.all(
        missions.map(async (m) => {
          try {
            const candidates = await matchingEngine.suggest(m.id);
            const myMatch = candidates.find((c) => c.userId === userId);
            return {
              ...m,
              matchScore: myMatch?.matchScore ?? 30, // Low default if not in top 3
              matchReasons: myMatch?.matchReasons ?? [],
            };
          } catch {
            return { ...m, matchScore: 50, matchReasons: [] as string[] };
          }
        })
      );

      return ranked.sort((a, b) => b.matchScore - a.matchScore).slice(0, input.limit);
    }),

  /** Suggest top 3 talent candidates for a mission (used by fixers/admins) */
  suggestTalent: protectedProcedure
    .input(z.object({ missionId: z.string() }))
    .query(async ({ input }) => {
      return matchingEngine.suggest(input.missionId);
    }),

  /** Self-assign: creator/agency claims a mission from the wall */
  claim: governedProcedure({

    kind: "LEGACY_MISSION_CLAIM",

    inputSchema: z.object({ missionId: z.string() }),

    caller: "mission:claim",

  })
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const mission = await ctx.db.mission.findUniqueOrThrow({
        where: { id: input.missionId },
      });

      if (mission.status !== "DRAFT") {
        throw new Error("Mission déjà prise ou non disponible");
      }
      if (mission.assigneeId) {
        throw new Error("Mission déjà assignée");
      }

      const talent = await ctx.db.talentProfile.findUnique({ where: { userId } });
      if (!talent) {
        throw new Error("Profil talent requis pour prendre une mission");
      }

      const updated = await ctx.db.mission.update({
        where: { id: input.missionId },
        data: { assigneeId: userId, status: "IN_PROGRESS" },
      });

      auditTrail.log({
        userId,
        action: "UPDATE",
        entityType: "Mission",
        entityId: input.missionId,
        newValue: { assigneeId: userId, status: "IN_PROGRESS", action: "CLAIM" },
      }).catch((err) => { console.warn("[audit-trail] mission claim log failed:", err instanceof Error ? err.message : err); });

      return updated;
    }),

  /** Assign a talent to a mission (dispatch) */
  assign: governedProcedure({

    kind: "LEGACY_MISSION_ASSIGN",

    inputSchema: z.object({ missionId: z.string(), assigneeId: z.string() }),

    caller: "mission:assign",

  })
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.mission.update({
        where: { id: input.missionId },
        data: { assigneeId: input.assigneeId, status: "IN_PROGRESS" },
      });

      auditTrail.log({
        userId: ctx.session.user.id,
        action: "UPDATE",
        entityType: "Mission",
        entityId: input.missionId,
        newValue: { assigneeId: input.assigneeId, status: "IN_PROGRESS", action: "ASSIGN" },
      }).catch((err) => { console.warn("[audit-trail] mission assign log failed:", err instanceof Error ? err.message : err); });

      return updated;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.mission.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          deliverables: { include: { qualityReviews: true } },
          campaign: true,
          strategy: true,
          driver: true,
          commissions: true,
        },
      });
    }),

  list: protectedProcedure
    .input(z.object({
      strategyId: z.string().optional(),
      campaignId: z.string().optional(),
      status: z.string().optional(),
      driverId: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const missions = await ctx.db.mission.findMany({
        where: {
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
          ...(input.campaignId ? { campaignId: input.campaignId } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.driverId ? { driverId: input.driverId } : {}),
        },
        include: {
          deliverables: { orderBy: { createdAt: "asc" as const } },
          driver: true,
          campaign: { select: { id: true, name: true, state: true } },
          commissions: { select: { id: true, status: true, grossAmount: true, netAmount: true, commissionAmount: true, currency: true, tierAtTime: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      // Enrich with assignee user object (no Prisma relation declared on Mission.assigneeId)
      const assigneeIds = missions.map((m) => m.assigneeId).filter(Boolean) as string[];
      const assignees = assigneeIds.length > 0
        ? await ctx.db.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true, email: true, image: true } })
        : [];
      const assigneeMap = new Map(assignees.map((u) => [u.id, u]));
      return missions.map((m) => ({ ...m, assignee: m.assigneeId ? (assigneeMap.get(m.assigneeId) ?? null) : null }));
    }),

  submitDeliverable: governedProcedure({


    kind: "LEGACY_MISSION_SUBMIT_DELIVERABLE",


    inputSchema: z.object({
      missionId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      fileUrl: z.string().optional(),
    }),


    caller: "mission:submitDeliverable",


  })
    .mutation(async ({ ctx, input }) => {
      const deliverable = await ctx.db.missionDeliverable.create({
        data: {
          missionId: input.missionId,
          title: input.title,
          description: input.description,
          fileUrl: input.fileUrl,
          status: "PENDING",
        },
      });

      // Auto-transition mission to REVIEW if still IN_PROGRESS
      const mission = await ctx.db.mission.findUnique({ where: { id: input.missionId } });
      if (mission && mission.status === "IN_PROGRESS") {
        await ctx.db.mission.update({
          where: { id: input.missionId },
          data: { status: "REVIEW" },
        });
      }

      // Auto-assign QC reviewer — find a higher-tier talent for peer review
      // QC routing: the mission creator's tier determines reviewer tier requirement
      (async () => {
        try {
          const missionData = await ctx.db.mission.findUnique({
            where: { id: input.missionId },
            include: { strategy: { include: { operator: true } } },
          });
          if (!missionData?.assigneeId) return;

          const creator = await ctx.db.talentProfile.findUnique({ where: { userId: missionData.assigneeId } });
          if (!creator) return;

          // Tier routing: APPRENTI → COMPAGNON+, COMPAGNON → MAITRE+, MAITRE → ASSOCIE/ADMIN, ASSOCIE → ADMIN
          const REVIEW_TIERS: Record<string, string[]> = {
            APPRENTI: ["COMPAGNON", "MAITRE", "ASSOCIE"],
            COMPAGNON: ["MAITRE", "ASSOCIE"],
            MAITRE: ["ASSOCIE"],
            ASSOCIE: [],
          };
          const eligibleTiers = (REVIEW_TIERS[creator.tier] ?? []) as GuildTier[];

          if (eligibleTiers.length > 0) {
            const reviewer = await ctx.db.talentProfile.findFirst({
              where: {
                tier: { in: eligibleTiers },
                userId: { not: missionData.assigneeId },
              },
              orderBy: { avgScore: "desc" },
            });

            if (reviewer) {
              await ctx.db.qualityReview.create({
                data: {
                  deliverableId: deliverable.id,
                  reviewerId: reviewer.userId,
                  reviewType: "PEER",
                  verdict: "PENDING", // assignation faite — vrai verdict rendu à la revue
                  pillarScores: {},
                  overallScore: 0,
                  feedback: "",
                },
              });
              console.log(`[qc-router] Peer review assigned: ${reviewer.displayName} (${reviewer.tier}) for deliverable ${deliverable.id}`);
            }
          }

          // Create DeliverableTracking entry for signal-based impact measurement
          const trackingExpiry = new Date();
          trackingExpiry.setDate(trackingExpiry.getDate() + 30); // 30-day tracking window
          await ctx.db.deliverableTracking.create({
            data: {
              deliverableId: deliverable.id,
              expectedSignals: { pillarImpact: missionData.advertis_vector ?? {} } as Prisma.InputJsonValue,
              status: "AWAITING_SIGNALS",
              expiresAt: trackingExpiry,
            },
          }).catch(() => { /* tracking is optional enhancement */ });
        } catch (err) {
          console.warn("[qc-router] auto-assignment failed:", err instanceof Error ? err.message : err);
        }
      })();

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "CREATE",
        entityType: "MissionDeliverable",
        entityId: deliverable.id,
        newValue: { missionId: input.missionId, title: input.title },
      }).catch((err) => { console.warn("[audit-trail] deliverable create log failed:", err instanceof Error ? err.message : err); });

      return deliverable;
    }),

  /** Review a deliverable with structured QC verdict */
  reviewDeliverable: governedProcedure({

    kind: "LEGACY_MISSION_REVIEW_DELIVERABLE",

    inputSchema: z.object({
      deliverableId: z.string(),
      verdict: z.enum(["ACCEPTED", "MINOR_REVISION", "MAJOR_REVISION", "REJECTED"]),
      overallScore: z.number().min(0).max(10),
      feedback: z.string(),
      pillarScores: z.record(z.string(), z.number()).optional(),
    }),

    caller: "mission:reviewDeliverable",

  })
    .mutation(async ({ ctx, input }) => {
      // Update or create quality review
      const existing = await ctx.db.qualityReview.findFirst({
        where: { deliverableId: input.deliverableId, reviewerId: ctx.session.user.id },
      });

      const reviewData = {
        verdict: input.verdict,
        overallScore: input.overallScore,
        feedback: input.feedback,
        pillarScores: (input.pillarScores ?? {}) as Prisma.InputJsonValue,
        reviewType: "FIXER" as const,
      };

      const review = existing
        ? await ctx.db.qualityReview.update({ where: { id: existing.id }, data: reviewData })
        : await ctx.db.qualityReview.create({
            data: { deliverableId: input.deliverableId, reviewerId: ctx.session.user.id, ...reviewData },
          });

      // Update deliverable status based on verdict
      const statusMap: Record<string, string> = {
        ACCEPTED: "ACCEPTED",
        MINOR_REVISION: "REVISION_REQUESTED",
        MAJOR_REVISION: "REVISION_REQUESTED",
        REJECTED: "REJECTED",
      };
      await ctx.db.missionDeliverable.update({
        where: { id: input.deliverableId },
        data: { status: statusMap[input.verdict] ?? "PENDING" },
      });

      // If all deliverables for this mission are ACCEPTED, suggest completing the mission
      const deliverable = await ctx.db.missionDeliverable.findUnique({
        where: { id: input.deliverableId },
        include: { mission: { include: { deliverables: true } } },
      });
      if (deliverable?.mission) {
        const allAccepted = deliverable.mission.deliverables.every(
          (d) => d.id === input.deliverableId ? input.verdict === "ACCEPTED" : d.status === "ACCEPTED"
        );
        if (allAccepted && deliverable.mission.deliverables.length > 0) {
          // Auto-suggest completion (don't force — just update tracking)
          await ctx.db.deliverableTracking.updateMany({
            where: { deliverableId: input.deliverableId },
            data: { status: "COMPLETE" },
          }).catch(() => {});
        }
      }

      auditTrail.log({
        userId: ctx.session.user.id,
        action: "UPDATE",
        entityType: "QualityReview",
        entityId: review.id,
        newValue: { verdict: input.verdict, score: input.overallScore, deliverableId: input.deliverableId },
      }).catch((err) => { console.warn("[audit-trail] review log failed:", err instanceof Error ? err.message : err); });

      return review;
    }),

  acceptDeliverable: governedProcedure({


    kind: "LEGACY_MISSION_ACCEPT_DELIVERABLE",


    inputSchema: z.object({ deliverableId: z.string() }),


    caller: "mission:acceptDeliverable",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.missionDeliverable.update({
        where: { id: input.deliverableId },
        data: { status: "ACCEPTED" },
      });
    }),

  delete: governedProcedure({


    kind: "LEGACY_MISSION_DELETE",


    inputSchema: z.object({ id: z.string() }),


    caller: "mission:delete",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mission.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });
    }),

  // SLA: Set deadline — uses slaDeadline DateTime field (not advertis_vector)
  setDeadline: governedProcedure({

    kind: "LEGACY_MISSION_SET_DEADLINE",

    inputSchema: z.object({ id: z.string(), deadline: z.string() }),

    caller: "mission:setDeadline",

  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mission.update({
        where: { id: input.id },
        data: { slaDeadline: new Date(input.deadline) },
      });
    }),

  // SLA: Check deadlines — reads slaDeadline DateTime field
  checkSla: adminProcedure
    .query(async ({ ctx }) => {
      const now = new Date();
      const missions = await ctx.db.mission.findMany({
        where: {
          status: { in: ["DRAFT", "IN_PROGRESS"] },
          slaDeadline: { not: null },
        },
        include: { driver: true, strategy: { select: { name: true } } },
      });

      const alerts = [];
      for (const m of missions) {
        const deadline = m.slaDeadline!;
        const hours = (deadline.getTime() - now.getTime()) / 3600000;
        if (hours < 48) {
          alerts.push({
            missionId: m.id,
            title: m.title,
            strategyName: m.strategy.name,
            driverChannel: m.driver?.channel,
            deadline: deadline.toISOString(),
            hoursRemaining: Math.round(hours * 10) / 10,
            severity: hours < 0 ? ("breached" as const) : hours < 24 ? ("urgent" as const) : ("warning" as const),
          });
        }
      }
      return alerts.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
    }),

  // ==========================================================================
  // Fiche mission — clôture + dispatch pipe (étage « Missions → pipes »)
  // ==========================================================================

  /** Terminer la mission (statut COMPLETED). */
  complete: governedProcedure({
    kind: "LEGACY_MISSION_COMPLETE",
    inputSchema: z.object({ id: z.string() }),
    caller: "mission:complete",
  }).mutation(async ({ ctx, input }) => {
    return ctx.db.mission.update({ where: { id: input.id }, data: { status: "COMPLETED" } });
  }),

  /** Annuler la mission (statut CANCELLED, motif tracé dans briefData). */
  cancel: governedProcedure({
    kind: "LEGACY_MISSION_CANCEL",
    inputSchema: z.object({ id: z.string(), reason: z.string().max(500).optional() }),
    caller: "mission:cancel",
  }).mutation(async ({ ctx, input }) => {
    const m = await ctx.db.mission.findUniqueOrThrow({ where: { id: input.id }, select: { briefData: true } });
    const bd = (m.briefData ?? {}) as Record<string, unknown>;
    return ctx.db.mission.update({
      where: { id: input.id },
      data: {
        status: "CANCELLED",
        briefData: { ...bd, cancelReason: input.reason ?? null, cancelledAt: new Date().toISOString() } as Prisma.InputJsonValue,
      },
    });
  }),

  /** Soumettre la mission à La Guilde (pipe marketplace public — modération opérateur). */
  submitToGuild: governedProcedure({
    kind: "LEGACY_MISSION_SUBMIT_TO_GUILD",
    inputSchema: z.object({ id: z.string() }),
    caller: "mission:submitToGuild",
  }).mutation(async ({ input }) => {
    return cm.submitMissionToGuild(input.id);
  }),

  // ==========================================================================
  // Activités de mission — couche d'exécution (asset/terrain + budget + KPI)
  // ==========================================================================

  /** Liste les activités d'une mission. */
  listActivities: protectedProcedure
    .input(z.object({ missionId: z.string() }))
    .query(({ input }) => cm.listMissionActivities(input.missionId)),

  /** Avancement agrégé via activités (progression + budget + KPI). */
  activityHealth: protectedProcedure
    .input(z.object({ missionId: z.string() }))
    .query(({ input }) => cm.getMissionActivityHealth(input.missionId)),

  /** Crée une activité (asset/terrain, budget, KPI). */
  createActivity: governedProcedure({
    kind: "LEGACY_MISSION_CREATE_ACTIVITY",
    inputSchema: z.object({
      missionId: z.string(),
      type: z.enum(["ASSET_CREATION", "FIELD_ACTION"]).optional(),
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      budgetAllocated: z.number().nonnegative().optional(),
      budgetCurrency: z.string().max(8).optional(),
      kpiLabel: z.string().max(80).optional(),
      kpiTarget: z.number().nonnegative().optional(),
      concludesMission: z.boolean().optional(),
    }),
    caller: "mission:createActivity",
  }).mutation(({ input }) => cm.createMissionActivity(input)),

  /** Génère le brief propre d'une activité (déterministe). */
  generateActivityBrief: governedProcedure({
    kind: "LEGACY_MISSION_GENERATE_ACTIVITY_BRIEF",
    inputSchema: z.object({ activityId: z.string() }),
    caller: "mission:generateActivityBrief",
  }).mutation(({ input }) => cm.generateMissionActivityBrief(input.activityId)),

  /** Édite le brief d'une activité (manuel, avant exécution). */
  updateActivityBrief: governedProcedure({
    kind: "LEGACY_MISSION_UPDATE_ACTIVITY_BRIEF",
    inputSchema: z.object({ activityId: z.string(), briefContent: z.record(z.string(), z.unknown()) }),
    caller: "mission:updateActivityBrief",
  }).mutation(({ input }) => cm.updateMissionActivityBrief(input.activityId, input.briefContent)),

  /** Complète une activité (+ KPI réel) → progression / conclusion mission. */
  completeActivity: governedProcedure({
    kind: "LEGACY_MISSION_COMPLETE_ACTIVITY",
    inputSchema: z.object({ activityId: z.string(), kpiActual: z.number().nonnegative().optional() }),
    caller: "mission:completeActivity",
  }).mutation(({ input }) => cm.completeMissionActivity(input.activityId, input.kpiActual)),

  /** Annule une activité. */
  cancelActivity: governedProcedure({
    kind: "LEGACY_MISSION_CANCEL_ACTIVITY",
    inputSchema: z.object({ activityId: z.string() }),
    caller: "mission:cancelActivity",
  }).mutation(({ input }) => cm.cancelMissionActivity(input.activityId)),

  /** Régénère les activités par défaut (déterministe) — vide + re-seed depuis le brief/action. */
  regenerateActivities: governedProcedure({
    kind: "LEGACY_MISSION_REGENERATE_ACTIVITIES",
    inputSchema: z.object({ missionId: z.string() }),
    caller: "mission:regenerateActivities",
  }).mutation(({ input }) => cm.regenerateMissionActivities(input.missionId)),

  /** Attribue (ou retire) un prestataire à une activité (mirroir de mission.assign). */
  assignActivity: governedProcedure({
    kind: "LEGACY_MISSION_ASSIGN_ACTIVITY",
    inputSchema: z.object({ activityId: z.string(), assigneeId: z.string().nullable() }),
    caller: "mission:assignActivity",
  }).mutation(({ input }) => cm.assignMissionActivity(input.activityId, input.assigneeId)),

  /** Rétroplanning de la mission ancré sur T0 (date de lancement → SLA → aujourd'hui). Déterministe. */
  retroplan: protectedProcedure
    .input(z.object({ missionId: z.string(), t0: z.string().optional() }))
    .query(({ input }) => cm.getMissionRetroplan(input.missionId, input.t0 ? new Date(input.t0) : undefined)),

  /** Fixe (ou efface) la durée d'une activité — bascule FIXÉE/DÉRIVÉE pour le rétroplanning. */
  setActivityDuration: governedProcedure({
    kind: "LEGACY_MISSION_SET_ACTIVITY_DURATION",
    inputSchema: z.object({ activityId: z.string(), durationDays: z.number().int().positive().nullable() }),
    caller: "mission:setActivityDuration",
  }).mutation(({ input }) => cm.setMissionActivityDuration(input.activityId, input.durationDays)),
});
