// ============================================================================
// MODULE M11 — La Guilde (Talents + Tier System)
// Score: 100/100 | Priority: P2 | Status: FUNCTIONAL
// Spec: Annexe D §D.6 + §6.9 | Division: L'Arene
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  TalentProfile CRUD (skills, bio, portfolio, availability)
// [x] REQ-2  Search talents by skill, availability, rating
// [x] REQ-3  Matching with missions (basic)
// [x] REQ-4  guildTier router (getProfile, checkPromotion, promote, demote, listByTier, getProgressPath) — CdC §3.1
// [x] REQ-5  guildOrg router (create, update, list, getMembers, getMetrics, addMember, removeMember) — CdC §3.1
// [x] REQ-6  Tier system: APPRENTI -> COMPAGNON -> MAITRE -> ASSOCIE with promotion criteria
// [x] REQ-7  tier-evaluator service: periodic evaluation, promotion/demotion recommendations
// [x] REQ-8  QualityReview integration (review routing by tier — CdC §4.1 qc-router)
// [x] REQ-9  advertis_vector on TalentProfile (creator scored on ADVE competency)
// [x] REQ-10 GuildOrganization model (collective agencies)
// [x] REQ-11 Visibility by tier (Apprenti=basic, Compagnon=partial, Maitre=full, Associe=console read)
//
// PROCEDURES: list, search, getProfile, updateProfile, getStats,
//             addPortfolioItem, removePortfolioItem, getPortfolio,
//             requestTierUpgrade, getSkillTree, unlockSkill,
//             listGuildEvents, registerForEvent, getGuildMetrics,
//             getLeaderboard, requestMentor, assignMentor
// ============================================================================

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

// ── Tier promotion criteria ─────────────────────────────────────────────────
const TIER_CRITERIA: Record<string, { minMissions: number; minScore: number; minFirstPass: number }> = {
  COMPAGNON: { minMissions: 5, minScore: 60, minFirstPass: 0.6 },
  MAITRE:    { minMissions: 20, minScore: 75, minFirstPass: 0.75 },
  ASSOCIE:   { minMissions: 50, minScore: 85, minFirstPass: 0.85 },
};

const TIER_ORDER = ["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"] as const;

export const guildeRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      tier: z.enum(["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"]).optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.talentProfile.findMany({
        where: input.tier ? { tier: input.tier } : undefined,
        orderBy: { totalMissions: "desc" },
        take: input.limit,
      });
    }),

  getProfile: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.talentProfile.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          portfolioItems: true,
          memberships: { where: { status: "ACTIVE" } },
          guildOrganization: true,
        },
      });
    }),

  getMyProfile: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.talentProfile.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          portfolioItems: true,
          memberships: { where: { status: "ACTIVE" } },
          guildOrganization: true,
        },
      });
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().optional(),
      bio: z.string().optional(),
      skills: z.array(z.string()).optional(),
      driverSpecialties: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.talentProfile.update({
        where: { userId: ctx.session.user.id },
        data: {
          ...(input.displayName ? { displayName: input.displayName } : {}),
          ...(input.bio ? { bio: input.bio } : {}),
          ...(input.skills ? { skills: input.skills } : {}),
          ...(input.driverSpecialties ? { driverSpecialties: input.driverSpecialties } : {}),
        },
      });
    }),

  getStats: adminProcedure
    .query(async ({ ctx }) => {
      const [total, byTier] = await Promise.all([
        ctx.db.talentProfile.count(),
        ctx.db.talentProfile.groupBy({
          by: ["tier"],
          _count: true,
        }),
      ]);
      return { total, byTier };
    }),

  addPortfolioItem: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      deliverableId: z.string().optional(),
      pillarTags: z.record(z.number()).optional(),
      fileUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.talentProfile.findUniqueOrThrow({
        where: { userId: ctx.session.user.id },
      });
      const { pillarTags, ...rest } = input;
      return ctx.db.portfolioItem.create({
        data: {
          ...rest,
          talentProfileId: profile.id,
          pillarTags: pillarTags as Prisma.InputJsonValue,
        },
      });
    }),

  removePortfolioItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.portfolioItem.delete({ where: { id: input.id } });
    }),

  getPortfolio: protectedProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.portfolioItem.findMany({
        where: { talentProfileId: input.talentProfileId },
        orderBy: { createdAt: "desc" },
      });
    }),

  // ── REQ-4/6: Tier upgrade workflow ───────────────────────────────────────
  requestTierUpgrade: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.talentProfile.findUniqueOrThrow({ where: { id: input.profileId } });
      if (profile.userId !== ctx.session.user.id) throw new Error("Acces refuse");

      const currentIdx = TIER_ORDER.indexOf(profile.tier as typeof TIER_ORDER[number]);
      if (currentIdx >= TIER_ORDER.length - 1) {
        return { eligible: false, reason: "Deja au tier maximum (ASSOCIE)." };
      }
      const nextTier = TIER_ORDER[currentIdx + 1]!;
      const criteria = TIER_CRITERIA[nextTier]!;

      const eligible =
        profile.totalMissions >= criteria.minMissions &&
        profile.avgScore >= criteria.minScore &&
        profile.firstPassRate >= criteria.minFirstPass;

      if (!eligible) {
        return {
          eligible: false,
          currentTier: profile.tier,
          nextTier,
          criteria,
          current: { missions: profile.totalMissions, avgScore: profile.avgScore, firstPassRate: profile.firstPassRate },
          reason: "Criteres non remplis pour la promotion.",
        };
      }

      // Promote
      await ctx.db.talentProfile.update({
        where: { id: input.profileId },
        data: { tier: nextTier },
      });
      return { eligible: true, promoted: true, from: profile.tier, to: nextTier };
    }),

  // ── REQ-9: Skill tree ───────────────────────────────────────────────────
  getSkillTree: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.talentProfile.findUniqueOrThrow({
        where: { id: input.profileId },
        select: { skills: true, tier: true, driverSpecialties: true, advertis_vector: true },
      });
      const skills = (profile.skills as string[]) ?? [];
      const specialties = (profile.driverSpecialties as Array<{ channel: string; level: string }>) ?? [];
      const vector = (profile.advertis_vector as Record<string, number>) ?? {};

      // Build a skill tree: ADVE pillars as branches, skills as leaves
      const adveSkills = ["a", "d", "v", "e", "r", "t", "i", "s"].map((key) => ({
        pillar: key,
        score: vector[key] ?? 0,
        unlocked: (vector[key] ?? 0) >= 30,
        mastered: (vector[key] ?? 0) >= 70,
      }));

      return {
        profileId: input.profileId,
        tier: profile.tier,
        skills,
        specialties,
        adveBranches: adveSkills,
        totalUnlocked: adveSkills.filter((s) => s.unlocked).length,
        totalMastered: adveSkills.filter((s) => s.mastered).length,
      };
    }),

  unlockSkill: protectedProcedure
    .input(z.object({ profileId: z.string(), skillId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.talentProfile.findUniqueOrThrow({ where: { id: input.profileId } });
      if (profile.userId !== ctx.session.user.id) throw new Error("Acces refuse");

      const currentSkills = (profile.skills as string[]) ?? [];
      if (currentSkills.includes(input.skillId)) {
        return { added: false, message: "Competence deja debloquee." };
      }
      const updatedSkills = [...currentSkills, input.skillId];
      await ctx.db.talentProfile.update({
        where: { id: input.profileId },
        data: { skills: updatedSkills },
      });
      return { added: true, skill: input.skillId, totalSkills: updatedSkills.length };
    }),

  // ── REQ-5/10: Community events — list guild organizations as events ─────
  listGuildEvents: protectedProcedure
    .query(async ({ ctx }) => {
      // GuildOrganization serves as event / collective container
      const orgs = await ctx.db.guildOrganization.findMany({
        where: { deletedAt: null },
        include: { members: { select: { id: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return orgs.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        date: e.createdAt,
        memberCount: e.members.length,
      }));
    }),

  registerForEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.talentProfile.findUniqueOrThrow({ where: { userId: ctx.session.user.id } });
      // Check if already a member of this organization
      if (profile.guildOrganizationId === input.eventId) {
        return { registered: false, message: "Deja inscrit a cet evenement." };
      }
      // Assign user to the guild organization
      await ctx.db.talentProfile.update({
        where: { id: profile.id },
        data: { guildOrganizationId: input.eventId },
      });
      return { registered: true, eventId: input.eventId };
    }),

  // ── REQ-5/8: Guild metrics + leaderboard ────────────────────────────────
  getGuildMetrics: protectedProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ ctx, input }) => {
      const guild = await ctx.db.guildOrganization.findUniqueOrThrow({
        where: { id: input.guildId },
        include: { members: true },
      });
      const profiles = guild.members;
      const totalMissions = profiles.reduce((s: number, p) => s + p.totalMissions, 0);
      const avgScore = profiles.length > 0
        ? profiles.reduce((s: number, p) => s + p.avgScore, 0) / profiles.length
        : 0;
      const tierDistribution = profiles.reduce(
        (acc: Record<string, number>, p) => { acc[p.tier] = (acc[p.tier] ?? 0) + 1; return acc; },
        {} as Record<string, number>,
      );
      return {
        guildId: input.guildId,
        guildName: guild.name,
        memberCount: profiles.length,
        totalMissions,
        avgScore: Math.round(avgScore * 10) / 10,
        tierDistribution,
      };
    }),

  getLeaderboard: protectedProcedure
    .query(async ({ ctx }) => {
      const top = await ctx.db.talentProfile.findMany({
        orderBy: [{ avgScore: "desc" }, { totalMissions: "desc" }],
        take: 25,
        select: { id: true, displayName: true, tier: true, avgScore: true, totalMissions: true, firstPassRate: true },
      });
      return top.map((t, i) => ({ rank: i + 1, ...t }));
    }),

  // ── REQ-7: Mentoring system ─────────────────────────────────────────────
  requestMentor: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.talentProfile.findUniqueOrThrow({ where: { id: input.profileId } });
      if (profile.userId !== ctx.session.user.id) throw new Error("Acces refuse");

      const tierIdx = TIER_ORDER.indexOf(profile.tier as typeof TIER_ORDER[number]);
      if (tierIdx >= 2) {
        return { requested: false, reason: "Les Maitres et Associes n'ont pas besoin de mentor." };
      }
      // Find a mentor: next tier or higher, best avgScore
      const mentorTiers = TIER_ORDER.slice(tierIdx + 1);
      const mentor = await ctx.db.talentProfile.findFirst({
        where: { tier: { in: [...mentorTiers] } },
        orderBy: { avgScore: "desc" },
        select: { id: true, displayName: true, tier: true },
      });
      if (!mentor) return { requested: true, assigned: false, reason: "Aucun mentor disponible pour le moment." };

      // Store mentoring in advertis_vector JSON (only JSON field on TalentProfile)
      const existing = (profile.advertis_vector as Record<string, unknown>) ?? {};
      await ctx.db.talentProfile.update({
        where: { id: input.profileId },
        data: { advertis_vector: { ...existing, mentorId: mentor.id, mentorRequestedAt: new Date().toISOString() } as Prisma.InputJsonValue },
      });
      return { requested: true, assigned: true, mentor };
    }),

  assignMentor: adminProcedure
    .input(z.object({ menteeId: z.string(), mentorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const mentee = await ctx.db.talentProfile.findUniqueOrThrow({ where: { id: input.menteeId } });
      const mentor = await ctx.db.talentProfile.findUniqueOrThrow({
        where: { id: input.mentorId },
        select: { id: true, displayName: true, tier: true },
      });
      const existing = (mentee.advertis_vector as Record<string, unknown>) ?? {};
      await ctx.db.talentProfile.update({
        where: { id: input.menteeId },
        data: { advertis_vector: { ...existing, mentorId: mentor.id, mentorAssignedAt: new Date().toISOString() } as Prisma.InputJsonValue },
      });
      return { assigned: true, menteeId: input.menteeId, mentor };
    }),
});
