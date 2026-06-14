/**
 * La Guilde — portail public (ADR-0093).
 *
 * Surface publique du marketplace crew de La Fusée, gouverneur IMHOTEP
 * (Crew Programs). Trois usages :
 *   1. Le mur des missions — lecture PUBLIQUE (publicProcedure), projection
 *      sans donnée de contact (mise en relation via la plateforme).
 *   2. Dépôt marque — une marque crée une mission. Modèle « Shell Strategy
 *      auto » : on réutilise Mission ; un Client + une Strategy minimale sont
 *      créés sous l'opérateur UPgraders si la marque n'en a pas encore. La
 *      mission part en attente de modération (guildPublished=false).
 *   3. Inscription talent/agence + modération opérateur.
 *
 * Toute mutation traverse Mestor via governedProcedure (kinds GUILD_*).
 * Les candidatures réutilisent le router mission-applications (APPLY_TO_MISSION).
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, publicProcedure, protectedProcedure, operatorProcedure } from "../init";
import { db } from "@/lib/db";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */
import { executeStructuredLLMCall } from "@/server/services/utils/llm-structured";
import {
  postGuildMissionInputSchema,
  guildMissionDraftSchema,
  extractBriefData,
  toPublicGuildMission,
  slugifyMissionTitle,
  guildMissionCategoryLabel,
  GUILD_MISSION_CATEGORIES,
  type PublicGuildMission,
} from "@/lib/types/guild-mission-brief";

const UPGRADERS_OPERATOR_SLUG = "upgraders";

/** Sélection Prisma minimale pour construire une projection publique. */
const PUBLIC_MISSION_SELECT = {
  id: true,
  publicSlug: true,
  title: true,
  category: true,
  sector: true,
  location: true,
  mode: true,
  budget: true,
  slaDeadline: true,
  guildPublishedAt: true,
  briefData: true,
} satisfies Prisma.MissionSelect;

/** Une mission est ouverte aux candidatures ⇔ publiée, DRAFT, non attribuée. */
const OPEN_MISSION_WHERE: Prisma.MissionWhereInput = {
  guildPublished: true,
  status: "DRAFT",
  assigneeId: null,
};

function assertOperator(role: string | null | undefined) {
  if (role !== "ADMIN" && role !== "OPERATOR") {
    throw new Error("Accès réservé aux opérateurs UPgraders.");
  }
}

export const laGuildeRouter = createTRPCRouter({
  // ───────────────────────── Mur public (lecture) ─────────────────────────

  /** Le mur des missions disponibles. Public, projeté sans contact. */
  listOpenMissions: publicProcedure
    .input(
      z
        .object({
          category: z.enum(GUILD_MISSION_CATEGORIES).optional(),
          sector: z.string().max(120).optional(),
          search: z.string().max(160).optional(),
          remoteOnly: z.boolean().optional(),
          limit: z.number().int().min(1).max(48).default(24),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const where: Prisma.MissionWhereInput = {
        ...OPEN_MISSION_WHERE,
        ...(input?.category ? { category: input.category } : {}),
        ...(input?.sector ? { sector: { contains: input.sector, mode: "insensitive" } } : {}),
        ...(input?.search
          ? {
              OR: [
                { title: { contains: input.search, mode: "insensitive" } },
                { sector: { contains: input.search, mode: "insensitive" } },
                { location: { contains: input.search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const [rows, total] = await Promise.all([
        db.mission.findMany({
          where,
          select: PUBLIC_MISSION_SELECT,
          orderBy: { guildPublishedAt: "desc" },
          take: input?.limit ?? 24,
          skip: input?.offset ?? 0,
        }),
        db.mission.count({ where }),
      ]);

      let missions: PublicGuildMission[] = rows.map(toPublicGuildMission);
      // Filtre remote appliqué après projection (remoteOk vit dans briefData).
      if (input?.remoteOnly) missions = missions.filter((m) => m.remoteOk);

      return { missions, total };
    }),

  /** Détail d'une mission par slug public. Inclut isOpen (candidatures ouvertes). */
  getMissionBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(async ({ input }) => {
      const row = await db.mission.findUnique({
        where: { publicSlug: input.slug },
        select: { ...PUBLIC_MISSION_SELECT, status: true, assigneeId: true, guildPublished: true },
      });
      if (!row || !row.guildPublished) return null;
      return {
        mission: toPublicGuildMission(row),
        isOpen: row.status === "DRAFT" && !row.assigneeId,
      };
    }),

  /** Compteurs pour l'en-tête du mur (total ouvert + répartition par catégorie). */
  stats: publicProcedure.query(async () => {
    const grouped = await db.mission.groupBy({
      by: ["category"],
      where: OPEN_MISSION_WHERE,
      _count: { _all: true },
    });
    const byCategory = grouped.map((g) => ({
      category: g.category,
      label: guildMissionCategoryLabel(g.category),
      count: g._count._all,
    }));
    const total = byCategory.reduce((acc, c) => acc + c.count, 0);
    return { total, byCategory };
  }),

  // ───────────────────────── Dépôt marque (gouverné) ──────────────────────

  /**
   * Une marque dépose une mission. Crée le Client + Strategy shell sous
   * UPgraders au besoin (ADR-0093, modèle « Shell Strategy auto »). La mission
   * part en attente de modération (guildPublished=false).
   */
  postMission: governedProcedure({
    kind: "GUILD_POST_MISSION",
    inputSchema: postGuildMissionInputSchema,
    requireOperator: false,
    caller: "laguilde:postMission",
  }).mutation(async ({ ctx, input }) => {
    const user = ctx.session.user;

    const operator = await db.operator.findUnique({
      where: { slug: UPGRADERS_OPERATOR_SLUG },
      select: { id: true },
    });
    if (!operator) {
      throw new Error(
        "Opérateur racine UPgraders introuvable — exécuter le seed (prisma/seed-upgraders.ts).",
      );
    }

    // Client shell — réutilisé si une marque du même nom existe déjà sous UPgraders.
    let client = await db.client.findFirst({
      where: { operatorId: operator.id, name: input.brandName },
      select: { id: true },
    });
    if (!client) {
      client = await db.client.create({
        data: {
          name: input.brandName,
          operatorId: operator.id,
          contactName: input.contactName ?? user.name ?? null,
          contactEmail: input.contactEmail ?? user.email ?? null,
          sector: input.sector,
        },
        select: { id: true },
      });
    }

    // Strategy shell — conteneur stratégique minimal exigé par Mission.strategyId.
    let strategy = await db.strategy.findFirst({
      where: { clientId: client.id, userId: user.id },
      select: { id: true },
    });
    if (!strategy) {
      strategy = await db.strategy.create({
        data: {
          name: input.brandName,
          userId: user.id,
          operatorId: operator.id,
          clientId: client.id,
          status: "ACTIVE",
          businessContext: { origin: "LAGUILDE", sector: input.sector } as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
    }

    const briefData = {
      ...extractBriefData(input),
      budgetCurrency: input.budgetCurrency,
    } as Prisma.InputJsonValue;

    const mission = await db.mission.create({
      data: {
        title: input.title,
        strategyId: strategy.id,
        mode: input.mode,
        description: input.summary,
        status: "DRAFT",
        priority: 5,
        budget: input.budgetAmount ?? null,
        slaDeadline: input.deadline ? new Date(input.deadline) : null,
        briefData,
        sector: input.sector,
        location: input.location,
        category: input.category,
        postedByUserId: user.id,
        guildPublished: false,
        guildSubmittedAt: new Date(),
      },
      select: { id: true },
    });

    // Slug dérivé de l'id (collision-free).
    const slug = slugifyMissionTitle(input.title, mission.id.slice(-6));
    await db.mission.update({ where: { id: mission.id }, data: { publicSlug: slug } });

    return { id: mission.id, slug, status: "PENDING_MODERATION" as const };
  }),

  /** Les missions déposées par la marque connectée + leur état de modération. */
  myPostedMissions: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.mission.findMany({
      where: { postedByUserId: ctx.session.user.id },
      select: {
        id: true,
        title: true,
        publicSlug: true,
        status: true,
        guildPublished: true,
        guildSubmittedAt: true,
        guildPublishedAt: true,
        category: true,
        budget: true,
        createdAt: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((m) => ({
      id: m.id,
      title: m.title,
      slug: m.publicSlug,
      category: m.category,
      categoryLabel: guildMissionCategoryLabel(m.category),
      budget: m.budget,
      applicationCount: m._count.applications,
      moderationState: m.guildPublished
        ? ("PUBLISHED" as const)
        : m.status === "CANCELLED"
          ? ("REJECTED" as const)
          : ("PENDING" as const),
      missionStatus: m.status,
      createdAt: m.createdAt.toISOString(),
    }));
  }),

  /**
   * Assist LLM OPTIONNEL (ADR-0093) — pré-remplissage du brief depuis une
   * description libre, pour les dirigeants pressés. NE PERSISTE RIEN : renvoie
   * un brouillon que le dirigeant corrige avant de soumettre via postMission
   * (chemin déterministe). Seule entrée LLM du portail ; le formulaire reste
   * pleinement utilisable sans IA (manual-first parity, ADR-0060). Si le
   * Gateway est indisponible (pas de clé / circuit ouvert), l'appel échoue
   * proprement et la saisie manuelle prend le relais.
   */
  draftMissionFromText: governedProcedure({
    kind: "GUILD_DRAFT_MISSION_FROM_TEXT",
    inputSchema: z.object({ rawText: z.string().min(20).max(5000) }),
    requireOperator: false,
    caller: "laguilde:draftMissionFromText",
  }).mutation(async ({ input }) => {
    const system = [
      "Tu es l'assistant de La Guilde, le marketplace créatif de La Fusée (Afrique francophone, devise FCFA).",
      "À partir de la description libre d'un dirigeant, tu structures un BROUILLON de brief de mission créative.",
      "Règle absolue : n'invente JAMAIS un budget, une marque, un site web ou une échéance absents du texte — laisse le champ vide.",
      "Rédige en français, concis et professionnel. Choisis la catégorie la plus proche de l'énumération.",
      "summary = une à deux phrases d'accroche. context = le contexte/enjeu reformulé. targetAudience = la cible si déductible.",
      "deliverables = livrables concrets déduits. skillsRequired = compétences pertinentes. N'extrapole pas au-delà du texte.",
    ].join("\n");
    const { data } = await executeStructuredLLMCall({
      system,
      prompt: `Description du dirigeant :\n"""\n${input.rawText.trim()}\n"""`,
      schema: guildMissionDraftSchema,
      caller: "laguilde:draftMission",
      schemaTitle: "GuildMissionDraft",
      maxOutputTokens: 2000,
    });
    return data;
  }),

  // ──────────────────── Inscription talent / agence (gouverné) ─────────────

  /** Profil guilde de l'utilisateur connecté (drive l'état de la page Rejoindre). */
  myGuildProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await db.talentProfile.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        guildOrganization: { select: { id: true, name: true, tier: true, website: true } },
      },
    });
    return {
      registered: !!profile,
      role: ctx.session.user.role ?? "USER",
      talentProfile: profile
        ? {
            id: profile.id,
            displayName: profile.displayName,
            bio: profile.bio,
            tier: profile.tier,
            skills: (profile.skills as string[] | null) ?? [],
            organization: profile.guildOrganization,
          }
        : null,
    };
  }),

  /** Inscription freelance/créateur — crée/upsert le TalentProfile + rôle CREATOR. */
  registerTalent: governedProcedure({
    kind: "GUILD_REGISTER_TALENT",
    inputSchema: z.object({
      displayName: z.string().min(2).max(120),
      bio: z.string().max(2000).optional(),
      skills: z.array(z.string().min(1).max(60)).max(40).default([]),
      driverSpecialties: z.array(z.string().min(1).max(60)).max(20).default([]),
      payoutPhone: z.string().max(20).optional(),
    }),
    requireOperator: false,
    caller: "laguilde:registerTalent",
  }).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const profile = await db.talentProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: input.displayName,
        bio: input.bio ?? null,
        skills: input.skills as Prisma.InputJsonValue,
        driverSpecialties: input.driverSpecialties as Prisma.InputJsonValue,
        payoutPhone: input.payoutPhone ?? null,
      },
      update: {
        displayName: input.displayName,
        bio: input.bio ?? null,
        skills: input.skills as Prisma.InputJsonValue,
        driverSpecialties: input.driverSpecialties as Prisma.InputJsonValue,
        ...(input.payoutPhone ? { payoutPhone: input.payoutPhone } : {}),
      },
      select: { id: true, displayName: true, tier: true },
    });

    // Promotion de rôle USER → CREATOR (effective au prochain login — JWT).
    if ((ctx.session.user.role ?? "USER") === "USER") {
      await db.user.update({ where: { id: userId }, data: { role: "CREATOR" } });
    }

    return { ...profile, roleUpgradedTo: "CREATOR" as const };
  }),

  /** Inscription agence / boîte de prod — GuildOrganization + TalentProfile owner + rôle AGENCY. */
  registerOrganization: governedProcedure({
    kind: "GUILD_REGISTER_ORGANIZATION",
    inputSchema: z.object({
      orgName: z.string().min(2).max(160),
      description: z.string().max(2000).optional(),
      website: z.string().url().max(2000).optional().or(z.literal("")),
      logoUrl: z.string().url().max(2000).optional().or(z.literal("")),
      specializations: z.array(z.string().min(1).max(60)).max(30).default([]),
      contactDisplayName: z.string().min(2).max(120),
      payoutPhone: z.string().max(20).optional(),
    }),
    requireOperator: false,
    caller: "laguilde:registerOrganization",
  }).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    // Idempotence : si l'utilisateur a déjà une org rattachée, on la met à jour.
    const existing = await db.talentProfile.findUnique({
      where: { userId },
      select: { id: true, guildOrganizationId: true },
    });

    let organizationId = existing?.guildOrganizationId ?? null;
    if (organizationId) {
      await db.guildOrganization.update({
        where: { id: organizationId },
        data: {
          name: input.orgName,
          description: input.description ?? null,
          website: input.website || null,
          logoUrl: input.logoUrl || null,
          specializations: input.specializations as Prisma.InputJsonValue,
        },
      });
    } else {
      const org = await db.guildOrganization.create({
        data: {
          name: input.orgName,
          description: input.description ?? null,
          website: input.website || null,
          logoUrl: input.logoUrl || null,
          specializations: input.specializations as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      organizationId = org.id;
    }

    await db.talentProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: input.contactDisplayName,
        guildOrganizationId: organizationId,
        skills: input.specializations as Prisma.InputJsonValue,
        payoutPhone: input.payoutPhone ?? null,
      },
      update: {
        displayName: input.contactDisplayName,
        guildOrganizationId: organizationId,
        ...(input.payoutPhone ? { payoutPhone: input.payoutPhone } : {}),
      },
    });

    if ((ctx.session.user.role ?? "USER") === "USER") {
      await db.user.update({ where: { id: userId }, data: { role: "AGENCY" } });
    }

    return { organizationId, roleUpgradedTo: "AGENCY" as const };
  }),

  // ─────────────────────── Modération opérateur ───────────────────────────

  /** File de modération : missions déposées en attente de publication. */
  listPendingModeration: operatorProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
    .query(async ({ input }) => {
      const rows = await db.mission.findMany({
        where: { guildSubmittedAt: { not: null }, guildPublished: false, status: "DRAFT" },
        select: {
          id: true,
          title: true,
          publicSlug: true,
          category: true,
          sector: true,
          location: true,
          budget: true,
          briefData: true,
          guildSubmittedAt: true,
          postedByUserId: true,
        },
        orderBy: { guildSubmittedAt: "asc" },
        take: input?.limit ?? 50,
      });
      return rows.map((m) => {
        const brief = (m.briefData ?? {}) as Record<string, unknown>;
        return {
          id: m.id,
          title: m.title,
          slug: m.publicSlug,
          category: m.category,
          categoryLabel: guildMissionCategoryLabel(m.category),
          sector: m.sector,
          location: m.location,
          budget: m.budget,
          brandName: typeof brief.brandName === "string" ? brief.brandName : "—",
          summary: typeof brief.summary === "string" ? brief.summary : "",
          contactEmail: typeof brief.contactEmail === "string" ? brief.contactEmail : null,
          submittedAt: m.guildSubmittedAt?.toISOString() ?? null,
        };
      });
    }),

  /** Décision opérateur : publier sur le mur ou rejeter (motivé). */
  publishMission: governedProcedure({
    kind: "GUILD_PUBLISH_MISSION",
    inputSchema: z.object({
      missionId: z.string(),
      decision: z.enum(["PUBLISH", "REJECT"]),
      note: z.string().max(1000).optional(),
    }),
    caller: "laguilde:publishMission",
  }).mutation(async ({ ctx, input }) => {
    assertOperator(ctx.session.user.role);

    const mission = await db.mission.findUnique({
      where: { id: input.missionId },
      select: { id: true, status: true, guildPublished: true, guildSubmittedAt: true, briefData: true },
    });
    if (!mission) throw new Error("Mission introuvable.");
    if (!mission.guildSubmittedAt) throw new Error("Cette mission n'a pas été déposée via La Guilde.");

    if (input.decision === "REJECT") {
      const brief = (mission.briefData ?? {}) as Record<string, unknown>;
      return db.mission.update({
        where: { id: mission.id },
        data: {
          status: "CANCELLED",
          briefData: {
            ...brief,
            moderationNote: input.note ?? null,
            moderatedAt: new Date().toISOString(),
            moderatedBy: ctx.session.user.id,
          } as Prisma.InputJsonValue,
        },
        select: { id: true, status: true },
      });
    }

    return db.mission.update({
      where: { id: mission.id },
      data: { guildPublished: true, guildPublishedAt: new Date() },
      select: { id: true, guildPublished: true, guildPublishedAt: true },
    });
  }),
});
