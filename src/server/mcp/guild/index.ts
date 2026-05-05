import { z } from "zod";
import { db } from "@/lib/db";
import * as matchingEngine from "@/server/services/matching-engine";
import * as tierEvaluator from "@/server/services/tier-evaluator";
import * as commissionEngine from "@/server/services/commission-engine";
import * as qcRouter from "@/server/services/qc-router";

// ---------------------------------------------------------------------------
// Guild MCP Server
// Outils de gestion de la Guilde (L'Arène) : matching talent, QC, tiers,
// commissions, adhésions, portfolios, certifications, analytics créateurs.
// ---------------------------------------------------------------------------

export const serverName = "guild";
export const serverDescription =
  "Serveur MCP Guild — Gestion de la Guilde créative, matching talent, QC, tiers, commissions, portfolios et certifications pour LaFusée Industry OS.";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const tools: ToolDefinition[] = [
  // ---- Talent Matching ----
  {
    name: "talent_match",
    description:
      "Trouve les meilleurs créateurs pour une mission en fonction des compétences, du canal et du tier requis.",
    inputSchema: z.object({
      skills: z.array(z.string()).describe("Compétences recherchées"),
      channel: z.string().optional().describe("Canal de la mission (social, video, print, etc.)"),
      minTier: z.enum(["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"]).optional().describe("Tier minimum"),
      limit: z.number().int().min(1).max(20).default(5),
    }),
    handler: async (input) => {
      const profiles = await db.talentProfile.findMany({
        include: { memberships: { where: { status: "ACTIVE" } } },
      });
      let filtered = profiles.filter((p) => {
        const profileSkills = (p.skills as string[]) ?? [];
        return (input.skills as string[]).every((s) => profileSkills.includes(s));
      });
      if (input.channel) {
        filtered = filtered.filter((p) => {
          const specialties = (p.driverSpecialties as Array<{ channel: string }>) ?? [];
          return specialties.some((s) => s.channel === input.channel);
        });
      }
      if (input.minTier) {
        const tierOrder = ["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"];
        const minIdx = tierOrder.indexOf(input.minTier as string);
        filtered = filtered.filter((p) => tierOrder.indexOf(p.tier) >= minIdx);
      }
      return {
        matches: filtered.slice(0, (input.limit as number) ?? 5),
        totalFound: filtered.length,
      };
    },
  },

  {
    name: "talent_match_for_mission",
    description:
      "Matching automatique pour une mission spécifique : analyse le brief et suggère les meilleurs créateurs.",
    inputSchema: z.object({
      missionId: z.string().describe("ID de la mission"),
    }),
    handler: async (input) => {
      const mission = await db.mission.findUniqueOrThrow({
        where: { id: input.missionId as string },
        include: { driver: true },
      });
      const channel = mission.driver?.channel;
      const candidates = await db.talentProfile.findMany({
        where: { tier: { in: ["COMPAGNON", "MAITRE", "ASSOCIE"] } },
        orderBy: { firstPassRate: "desc" },
        take: 5,
      });
      return {
        missionId: mission.id,
        missionTitle: mission.title,
        channel,
        candidates: candidates.map((c) => ({
          userId: c.userId,
          displayName: c.displayName,
          tier: c.tier,
          firstPassRate: c.firstPassRate,
          totalMissions: c.totalMissions,
        })),
      };
    },
  },

  // ---- QC Routing ----
  {
    name: "qc_route",
    description:
      "Route un livrable vers le processus de Quality Control adapté (automatique ou manuel selon le tier).",
    inputSchema: z.object({
      missionId: z.string().describe("ID de la mission à review"),
      deliverableUrl: z.string().optional().describe("URL du livrable"),
    }),
    handler: async (input) => {
      const deliverables = await db.missionDeliverable.findMany({
        where: { missionId: input.missionId as string },
        take: 1,
      });
      if (deliverables.length === 0) {
        return { error: "No deliverables found for this mission" };
      }
      return qcRouter.routeReview(deliverables[0]!.id);
    },
  },

  {
    name: "qc_stats",
    description:
      "Statistiques globales du QC : nombre de reviews, score moyen, taux de first-pass.",
    inputSchema: z.object({}),
    handler: async () => {
      const [totalReviews, avgScore, firstPassCount] = await Promise.all([
        db.qualityReview.count(),
        db.qualityReview.aggregate({ _avg: { overallScore: true } }),
        db.qualityReview.count({ where: { verdict: "ACCEPTED" } }),
      ]);
      // lafusee:allow-adhoc-completion: MCP guild context summary metric (talent matching ratio, not pillar)
      const firstPassRate = totalReviews > 0 ? Math.round((firstPassCount / totalReviews) * 100) : 0;
      return {
        totalReviews,
        avgScore: avgScore._avg.overallScore ?? 0,
        firstPassRate,
      };
    },
  },

  // ---- Tier Evaluation ----
  {
    name: "tier_evaluate",
    description:
      "Évalue le tier d'un créateur en fonction de ses performances, ancienneté et qualité de travail.",
    inputSchema: z.object({
      userId: z.string().describe("ID du créateur à évaluer"),
    }),
    handler: async (input) => {
      const profile = await db.talentProfile.findUniqueOrThrow({
        where: { userId: input.userId as string },
      });
      return tierEvaluator.evaluateCreator(profile.id);
    },
  },

  {
    name: "tier_distribution",
    description:
      "Distribution des créateurs par tier avec statistiques moyennes (first-pass rate, missions).",
    inputSchema: z.object({}),
    handler: async () => {
      return db.talentProfile.groupBy({
        by: ["tier"],
        _count: true,
        _avg: { firstPassRate: true, totalMissions: true },
      });
    },
  },

  // ---- Commission Calculation ----
  {
    name: "commission_calculate",
    description:
      "Calcule la commission d'un créateur pour une mission en fonction de son tier et du montant brut.",
    inputSchema: z.object({
      missionId: z.string().describe("ID de la mission"),
      grossAmount: z.number().min(0).describe("Montant brut de la mission"),
    }),
    handler: async (input) => {
      return commissionEngine.calculate(input.missionId as string);
    },
  },

  {
    name: "commission_history",
    description:
      "Historique des commissions d'un créateur avec détail par mission.",
    inputSchema: z.object({
      userId: z.string().describe("ID du créateur"),
      limit: z.number().int().min(1).max(100).default(20),
    }),
    handler: async (input) => {
      const commissions = await db.commission.findMany({
        where: { talentId: input.userId as string },
        include: { mission: true },
        orderBy: { createdAt: "desc" },
        take: (input.limit as number) ?? 20,
      });
      const totalEarned = commissions.reduce((sum, c) => sum + (c.commissionAmount ?? 0), 0);
      return { userId: input.userId, commissions, totalEarned };
    },
  },

  // ---- Membership Management ----
  {
    name: "membership_list",
    description:
      "Liste les adhésions actives de la Guilde avec statut et organisation.",
    inputSchema: z.object({
      organizationId: z.string().optional().describe("Filtrer par organisation"),
      status: z.enum(["ACTIVE", "OVERDUE", "CANCELLED", "EXEMPT"]).optional(),
    }),
    handler: async (input) => {
      const memberships = await db.membership.findMany({
        where: {
          ...(input.status ? { status: input.status as "ACTIVE" | "OVERDUE" | "CANCELLED" | "EXEMPT" } : {}),
        },
        include: { talentProfile: true },
        orderBy: { createdAt: "desc" },
      });
      return { memberships, count: memberships.length };
    },
  },

  {
    name: "membership_manage",
    description:
      "Gère une adhésion : activation, suspension, changement de statut.",
    inputSchema: z.object({
      membershipId: z.string().describe("ID de l'adhésion"),
      action: z.enum(["activate", "cancel", "exempt"]).describe("Action à effectuer"),
      reason: z.string().optional().describe("Raison du changement"),
    }),
    handler: async (input) => {
      const statusMap = {
        activate: "ACTIVE" as const,
        cancel: "CANCELLED" as const,
        exempt: "EXEMPT" as const,
      };
      const membership = await db.membership.update({
        where: { id: input.membershipId as string },
        data: { status: statusMap[input.action as "activate" | "cancel" | "exempt"] },
      });
      return membership;
    },
  },

  // ---- Portfolio Management ----
  {
    name: "portfolio_get",
    description:
      "Récupère le portfolio d'un créateur avec ses meilleurs travaux et spécialités.",
    inputSchema: z.object({
      userId: z.string().describe("ID du créateur"),
    }),
    handler: async (input) => {
      const profile = await db.talentProfile.findUnique({
        where: { userId: input.userId as string },
        include: { portfolioItems: { orderBy: { createdAt: "desc" } } },
      });
      return profile;
    },
  },

  // ---- Certification ----
  {
    name: "certification_check",
    description:
      "Vérifie les certifications d'un créateur et suggère les prochaines à obtenir.",
    inputSchema: z.object({
      userId: z.string().describe("ID du créateur"),
    }),
    handler: async (input) => {
      const profile = await db.talentProfile.findUniqueOrThrow({
        where: { userId: input.userId as string },
        include: { certifications: true },
      });
      return {
        userId: input.userId,
        tier: profile.tier,
        certifications: profile.certifications.map((c) => ({
          name: c.name,
          category: c.category,
          issuedAt: c.issuedAt,
          expiresAt: c.expiresAt,
        })),
        skills: (profile.skills as string[]) ?? [],
      };
    },
  },

  // ---- Guild Org Management ----
  {
    name: "guild_org_directory",
    description:
      "Annuaire des organisations de la Guilde avec leurs membres et spécialités.",
    inputSchema: z.object({}),
    handler: async () => {
      return db.guildOrganization.findMany({
        include: {
          members: { select: { id: true, displayName: true, tier: true, skills: true } },
        },
      });
    },
  },

  // ---- Creator Analytics ----
  {
    name: "creator_analytics",
    description:
      "Analytics détaillées d'un créateur : performance, tendance, comparaison avec la moyenne de la Guilde.",
    inputSchema: z.object({
      userId: z.string().describe("ID du créateur"),
    }),
    handler: async (input) => {
      const [profile, guildAvg] = await Promise.all([
        db.talentProfile.findUniqueOrThrow({ where: { userId: input.userId as string } }),
        db.talentProfile.aggregate({
          _avg: { firstPassRate: true, totalMissions: true },
          where: { totalMissions: { gte: 1 } },
        }),
      ]);
      return {
        creator: {
          displayName: profile.displayName,
          tier: profile.tier,
          firstPassRate: profile.firstPassRate,
          totalMissions: profile.totalMissions,
          skills: profile.skills,
        },
        guildAverage: {
          firstPassRate: guildAvg._avg.firstPassRate ?? 0,
          totalMissions: guildAvg._avg.totalMissions ?? 0,
        },
        aboveAverage: (profile.firstPassRate ?? 0) > (guildAvg._avg.firstPassRate ?? 0),
      };
    },
  },

  {
    name: "creator_top_performers",
    description:
      "Classement des meilleurs créateurs de la Guilde par taux de first-pass.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(50).default(10),
      minMissions: z.number().int().min(1).default(5).describe("Minimum de missions complétées"),
    }),
    handler: async (input) => {
      const performers = await db.talentProfile.findMany({
        where: { totalMissions: { gte: (input.minMissions as number) ?? 5 } },
        orderBy: { firstPassRate: "desc" },
        take: (input.limit as number) ?? 10,
      });
      return {
        topPerformers: performers.map((p) => ({
          displayName: p.displayName,
          tier: p.tier,
          firstPassRate: p.firstPassRate,
          totalMissions: p.totalMissions,
        })),
      };
    },
  },
];
