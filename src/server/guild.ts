import { Prisma, type Mission, type MissionApplication, type TalentProfile } from "@prisma/client";
import { z } from "zod";
import { getDb } from "@/lib/db";
import type { MissionStatus } from "@/domain/campaign";
import {
  APPLICATION_STATUSES,
  canApplyToMission,
  canDecideApplication,
  canToggleGuild,
  MAX_SKILLS,
  normalizeSkills,
  TALENT_AVAILABILITIES,
  TALENT_VISIBILITIES,
  toWallMission,
  type ApplicationStatus,
  type TalentAvailability,
  type TalentVisibility,
  type WallMission,
} from "@/domain/guild";
import { ACTION_KIND_LABELS, actionKindSchema } from "./campaigns";
import { logAudit } from "./audit";

/**
 * Guilde — profils talents, mur des missions ouvertes et candidatures
 * (WP-011, essence d'ADR-0098 legacy simplifiée). Les gates pures vivent
 * dans `src/domain/guild.ts` ; ici la plomberie DB, la tenancy et l'audit.
 *
 * Doctrine :
 *   - mutation = transaction + `AuditLog` chaîné (pattern finance.ts), flips
 *     de statut atomiques (`updateMany` conditionnel — une décision ne se
 *     prend qu'une fois, même sous double-clic).
 *   - tenancy à DOUBLE sens : côté marque, toute décision vérifie que la
 *     mission appartient à la marque de session (id forgé = introuvable) ;
 *     côté talent, le mur est cross-workspace mais ne laisse JAMAIS sortir
 *     une donnée de marque (projection whitelist `toWallMission`, testée).
 *   - le pays du talent vient du référentiel Country — jamais inventé.
 */

// ── Schémas de frontière (server actions → service) ────────────────────

/** URL http(s) valide ? (refine sans dépendre des helpers URL de Zod) */
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export const talentProfileSchema = z.object({
  headline: z
    .string()
    .trim()
    .min(4, "Décrivez votre pratique en quelques mots (4 caractères minimum).")
    .max(120, "120 caractères maximum — gardez l'accroche courte."),
  skills: z
    .string()
    .trim()
    .max(600, "Liste de compétences trop longue.")
    .transform(normalizeSkills)
    .refine((skills) => skills.length >= 1, {
      message: "Déclarez au moins une compétence (une par ligne).",
    }),
  city: z.string().trim().min(2, "Indiquez votre ville (2 caractères minimum).").max(80),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Choisissez votre pays."),
  whatsapp: z
    .string()
    .trim()
    .max(24, "Numéro WhatsApp trop long.")
    .default("")
    .transform((value) => value.replace(/[\s().-]/g, ""))
    .refine((value) => value === "" || /^\+?\d{8,15}$/.test(value), {
      message: "Numéro WhatsApp invalide — indicatif pays puis chiffres (ex. +221771234567).",
    }),
  portfolioUrl: z
    .string()
    .trim()
    .max(300, "URL de portfolio trop longue.")
    .default("")
    .refine((value) => value === "" || isHttpUrl(value), {
      message: "URL de portfolio invalide — collez un lien complet (https://…).",
    }),
  availability: z.enum(TALENT_AVAILABILITIES),
  visibility: z.enum(TALENT_VISIBILITIES),
});

export type TalentProfileInput = z.infer<typeof talentProfileSchema>;

export const pitchSchema = z
  .string()
  .trim()
  .min(20, "Présentez votre approche en quelques phrases (20 caractères minimum).")
  .max(1500, "1 500 caractères maximum — le détail se joue après la mise en relation.");

// ── Erreur métier (messages FR prêts à afficher) ───────────────────────

export type GuildErrorCode =
  | "PROFILE_REQUIRED"
  | "MISSION_NOT_FOUND"
  | "APPLICATION_NOT_FOUND"
  | "ALREADY_APPLIED"
  | "UNKNOWN_COUNTRY"
  | "GATE_REFUSED";

export class GuildError extends Error {
  constructor(
    public readonly code: GuildErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GuildError";
  }
}

function gateRefused(reason: string): GuildError {
  return new GuildError("GATE_REFUSED", reason);
}

// ── Profil talent (création / édition — voie canonique unique) ─────────

export type UpsertTalentProfileInput = {
  userId: string;
  /** Workspace de session de l'acteur — la ligne d'audit vit dans sa chaîne. */
  workspaceId: string;
  data: TalentProfileInput;
  actorId: string;
};

export type UpsertTalentProfileResult = { profile: TalentProfile; created: boolean };

/**
 * Crée ou met à jour le profil talent du compte (un seul par userId — unique
 * en base). Le pays doit exister dans le référentiel Country (aucun pays
 * inventé). Transaction : upsert + AuditLog `talent.profile.create|update`.
 */
export async function upsertTalentProfile(
  input: UpsertTalentProfileInput,
): Promise<UpsertTalentProfileResult> {
  const { userId, workspaceId, data, actorId } = input;
  const db = getDb();

  const country = await db.country.findUnique({ where: { code: data.countryCode } });
  if (!country) {
    throw new GuildError(
      "UNKNOWN_COUNTRY",
      `Pays « ${data.countryCode} » absent du référentiel — choisissez un pays de la liste.`,
    );
  }

  const existing = await db.talentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  const values = {
    headline: data.headline,
    skills: data.skills,
    city: data.city,
    countryCode: data.countryCode,
    whatsapp: data.whatsapp || null,
    portfolioUrl: data.portfolioUrl || null,
    availability: data.availability,
    visibility: data.visibility,
  };

  return getDb().$transaction(async (tx) => {
    const profile = existing
      ? await tx.talentProfile.update({ where: { id: existing.id }, data: values })
      : await tx.talentProfile.create({ data: { userId, ...values } });
    await logAudit(
      {
        workspaceId,
        actorId,
        action: existing ? "talent.profile.update" : "talent.profile.create",
        entity: "TalentProfile",
        entityId: profile.id,
        payload: {
          headline: data.headline,
          city: data.city,
          countryCode: data.countryCode,
          skills: data.skills,
          availability: data.availability,
          visibility: data.visibility,
        },
      },
      tx,
    );
    return { profile, created: !existing };
  });
}

/** Profil talent du compte — null tant que l'onboarding n'est pas fait. */
export async function getTalentProfile(userId: string): Promise<TalentProfile | null> {
  const db = getDb();
  return db.talentProfile.findUnique({ where: { userId } });
}

// ── Côté marque : ouvrir/fermer le mur + décider les candidatures ──────

type MissionRef = Mission & {
  brief: { action: { campaign: { brand: { workspaceId: string } } } };
};

/** Mission de la marque de session (id forgé ⇒ introuvable) + workspace d'audit. */
async function requireBrandMission(brandId: string, missionId: string): Promise<MissionRef> {
  const db = getDb();
  const mission = await db.mission.findFirst({
    where: { id: missionId, brief: { action: { campaign: { brandId } } } },
    include: {
      brief: {
        select: {
          action: {
            select: { campaign: { select: { brand: { select: { workspaceId: true } } } } },
          },
        },
      },
    },
  });
  if (!mission) {
    throw new GuildError("MISSION_NOT_FOUND", "Mission introuvable dans cet espace marque.");
  }
  return mission as MissionRef;
}

export type ToggleGuildInput = {
  brandId: string;
  missionId: string;
  open: boolean;
  actorId: string;
};

/**
 * Gate « ouvrir à la Guilde » (et son inverse) : mission OPEN uniquement.
 * Flip atomique openToGuild (conditionné à la valeur opposée — un double
 * clic ne produit qu'une ligne d'audit) + AuditLog `mission.guild.open|close`.
 * Fermer le mur ne touche PAS aux candidatures déjà reçues : la marque peut
 * encore les décider tant que la mission est ouverte.
 */
export async function setMissionGuildOpen(input: ToggleGuildInput): Promise<Mission> {
  const { brandId, missionId, open, actorId } = input;
  const mission = await requireBrandMission(brandId, missionId);

  const gate = canToggleGuild(mission.status as MissionStatus);
  if (!gate.ok) throw gateRefused(gate.reason);

  const db = getDb();
  return db.$transaction(async (tx) => {
    const flipped = await tx.mission.updateMany({
      where: { id: mission.id, status: "OPEN", openToGuild: !open },
      data: { openToGuild: open },
    });
    if (flipped.count === 0) {
      throw gateRefused(
        open
          ? "Cette mission est déjà publiée sur le mur de la Guilde."
          : "Cette mission n'est pas (ou plus) publiée sur le mur de la Guilde.",
      );
    }
    await logAudit(
      {
        workspaceId: mission.brief.action.campaign.brand.workspaceId,
        actorId,
        action: open ? "mission.guild.open" : "mission.guild.close",
        entity: "Mission",
        entityId: mission.id,
      },
      tx,
    );
    return tx.mission.findUniqueOrThrow({ where: { id: mission.id } });
  });
}

type ApplicationRef = MissionApplication & {
  mission: MissionRef;
  talent: TalentProfile & { user: { name: string | null } };
};

/** Candidature d'une mission de la marque de session (id forgé ⇒ introuvable). */
async function requireBrandApplication(
  brandId: string,
  applicationId: string,
): Promise<ApplicationRef> {
  const db = getDb();
  const application = await db.missionApplication.findFirst({
    where: {
      id: applicationId,
      mission: { brief: { action: { campaign: { brandId } } } },
    },
    include: {
      mission: {
        include: {
          brief: {
            select: {
              action: {
                select: { campaign: { select: { brand: { select: { workspaceId: true } } } } },
              },
            },
          },
        },
      },
      talent: { include: { user: { select: { name: true } } } },
    },
  });
  if (!application) {
    throw new GuildError(
      "APPLICATION_NOT_FOUND",
      "Candidature introuvable dans cet espace marque.",
    );
  }
  return application as ApplicationRef;
}

/** `MissionApplication.status` relu depuis la DB → union du domaine. */
function applicationStatus(raw: string): ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(raw)
    ? (raw as ApplicationStatus)
    : "APPLIED";
}

export type ApplicationDecisionInput = {
  brandId: string;
  applicationId: string;
  actorId: string;
};

/** Transition atomique d'une candidature (shortlist / décliner) + audit. */
async function transitionApplication(
  input: ApplicationDecisionInput,
  to: ApplicationStatus,
  auditAction: string,
  data: Prisma.MissionApplicationUpdateManyMutationInput,
): Promise<MissionApplication> {
  const { brandId, applicationId, actorId } = input;
  const application = await requireBrandApplication(brandId, applicationId);

  const gate = canDecideApplication(
    application.mission.status as MissionStatus,
    applicationStatus(application.status),
    to,
  );
  if (!gate.ok) throw gateRefused(gate.reason);

  const db = getDb();
  return db.$transaction(async (tx) => {
    const flipped = await tx.missionApplication.updateMany({
      where: { id: application.id, status: application.status },
      data: { ...data, status: to },
    });
    if (flipped.count === 0) {
      throw gateRefused("Cette candidature vient de changer d'état — rechargez la page.");
    }
    await logAudit(
      {
        workspaceId: application.mission.brief.action.campaign.brand.workspaceId,
        actorId,
        action: auditAction,
        entity: "MissionApplication",
        entityId: application.id,
        payload: { missionId: application.missionId, talentId: application.talentId },
      },
      tx,
    );
    return tx.missionApplication.findUniqueOrThrow({ where: { id: application.id } });
  });
}

/** APPLIED → SHORTLISTED : la marque retient la candidature pour arbitrage. */
export async function shortlistApplication(
  input: ApplicationDecisionInput,
): Promise<MissionApplication> {
  return transitionApplication(input, "SHORTLISTED", "mission.application.shortlist", {});
}

/** APPLIED | SHORTLISTED → DECLINED : décision terminale, datée. */
export async function declineApplication(
  input: ApplicationDecisionInput,
): Promise<MissionApplication> {
  return transitionApplication(input, "DECLINED", "mission.application.decline", {
    decidedAt: new Date(),
  });
}

export type AcceptApplicationResult = {
  application: MissionApplication;
  mission: Mission;
  /** Candidatures sœurs encore ouvertes passées DECLINED dans la même transaction. */
  declinedCount: number;
};

/**
 * Accepter une candidature = LA décision d'assignation (remplace la saisie
 * « nom déclaré », conservée en fallback). Transaction unique :
 *   1. flip atomique Mission OPEN → ASSIGNED (+ assigneeTalentId, assignee =
 *      nom du talent dénormalisé pour l'UI existante, assignedAt) ;
 *   2. flip atomique de la candidature → ACCEPTED (decidedAt) ;
 *   3. toutes les candidatures sœurs encore APPLIED/SHORTLISTED → DECLINED ;
 *   4. AuditLog `mission.assign` (payload { via: "guilde", … }) — même action
 *      que l'assignation déclarée : l'historique d'assignation reste unifié.
 */
export async function acceptApplication(
  input: ApplicationDecisionInput,
): Promise<AcceptApplicationResult> {
  const { brandId, applicationId, actorId } = input;
  const application = await requireBrandApplication(brandId, applicationId);

  const gate = canDecideApplication(
    application.mission.status as MissionStatus,
    applicationStatus(application.status),
    "ACCEPTED",
  );
  if (!gate.ok) throw gateRefused(gate.reason);

  // Nom dénormalisé : nom du compte, sinon l'accroche du profil — jamais l'email.
  const assigneeName = application.talent.user.name?.trim() || application.talent.headline;

  const db = getDb();
  return db.$transaction(async (tx) => {
    const now = new Date();

    const missionFlip = await tx.mission.updateMany({
      where: { id: application.missionId, status: "OPEN" },
      data: {
        status: "ASSIGNED",
        assignee: assigneeName,
        assigneeTalentId: application.talentId,
        assignedAt: now,
      },
    });
    if (missionFlip.count === 0) {
      throw gateRefused("Cette mission vient d'être assignée — rechargez la page.");
    }

    const applicationFlip = await tx.missionApplication.updateMany({
      where: { id: application.id, status: { in: ["APPLIED", "SHORTLISTED"] } },
      data: { status: "ACCEPTED", decidedAt: now },
    });
    if (applicationFlip.count === 0) {
      throw gateRefused("Cette candidature vient de changer d'état — rechargez la page.");
    }

    const declined = await tx.missionApplication.updateMany({
      where: {
        missionId: application.missionId,
        id: { not: application.id },
        status: { in: ["APPLIED", "SHORTLISTED"] },
      },
      data: { status: "DECLINED", decidedAt: now },
    });

    await logAudit(
      {
        workspaceId: application.mission.brief.action.campaign.brand.workspaceId,
        actorId,
        action: "mission.assign",
        entity: "Mission",
        entityId: application.missionId,
        payload: {
          via: "guilde",
          applicationId: application.id,
          talentId: application.talentId,
          assignee: assigneeName,
          declinedApplications: declined.count,
        },
      },
      tx,
    );

    return {
      application: await tx.missionApplication.findUniqueOrThrow({
        where: { id: application.id },
      }),
      mission: await tx.mission.findUniqueOrThrow({ where: { id: application.missionId } }),
      declinedCount: declined.count,
    };
  });
}

// ── Côté talent : candidater ───────────────────────────────────────────

export type ApplyToMissionInput = {
  userId: string;
  missionId: string;
  pitch: string;
  actorId: string;
};

/**
 * Candidature d'un talent à une mission du mur. La mission est cherchée
 * CROSS-WORKSPACE mais uniquement si elle est réellement sur le mur
 * (openToGuild + OPEN) — un id forgé vers une mission privée reste
 * introuvable, l'existence même d'une mission fermée ne fuite pas.
 * Unicité (mission × talent) garantie par la contrainte DB (le double-clic
 * concurrent est rattrapé en `ALREADY_APPLIED`). Transaction : création +
 * AuditLog `mission.apply` dans la chaîne du workspace de la MARQUE (c'est
 * son agrégat mission qui bouge ; l'acteur reste le talent).
 */
export async function applyToMission(input: ApplyToMissionInput): Promise<MissionApplication> {
  const { userId, missionId, pitch, actorId } = input;
  const db = getDb();

  const profile = await db.talentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) {
    throw new GuildError(
      "PROFILE_REQUIRED",
      "Créez d'abord votre profil talent — c'est lui que la marque lit avec votre pitch.",
    );
  }

  const mission = await db.mission.findFirst({
    where: { id: missionId, openToGuild: true, status: "OPEN" },
    select: {
      id: true,
      status: true,
      openToGuild: true,
      brief: {
        select: {
          action: {
            select: { campaign: { select: { brand: { select: { workspaceId: true } } } } },
          },
        },
      },
    },
  });
  if (!mission) {
    throw new GuildError(
      "MISSION_NOT_FOUND",
      "Cette mission n'est plus sur le mur — elle a été retirée ou déjà assignée.",
    );
  }
  const gate = canApplyToMission(mission.status as MissionStatus, mission.openToGuild);
  if (!gate.ok) throw gateRefused(gate.reason);

  const existing = await db.missionApplication.findUnique({
    where: { missionId_talentId: { missionId: mission.id, talentId: profile.id } },
    select: { id: true },
  });
  if (existing) {
    throw new GuildError(
      "ALREADY_APPLIED",
      "Vous avez déjà candidaté à cette mission — une seule candidature par mission.",
    );
  }

  try {
    return await db.$transaction(async (tx) => {
      const application = await tx.missionApplication.create({
        data: { missionId: mission.id, talentId: profile.id, pitch, status: "APPLIED" },
      });
      await logAudit(
        {
          workspaceId: mission.brief.action.campaign.brand.workspaceId,
          actorId,
          action: "mission.apply",
          entity: "MissionApplication",
          entityId: application.id,
          payload: { missionId: mission.id, talentId: profile.id },
        },
        tx,
      );
      return application;
    });
  } catch (err) {
    // Course perdue sur la contrainte @@unique(missionId, talentId).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new GuildError(
        "ALREADY_APPLIED",
        "Vous avez déjà candidaté à cette mission — une seule candidature par mission.",
      );
    }
    throw err;
  }
}

// ── Lectures : mur, mes candidatures, candidatures d'une mission ───────

/** Libellé du type d'action depuis la clé stockée (custom si hors registre). */
function kindLabel(kind: string): string {
  return ACTION_KIND_LABELS[actionKindSchema.safeParse(kind).data ?? "custom"];
}

/**
 * Le mur des missions ouvertes — CROSS-WORKSPACE par construction, projeté
 * par whitelist `toWallMission` : ni marque, ni campagne, ni objectif, ni
 * budget ne sortent d'ici (contrat testé dans tests/guild.test.ts).
 */
export async function listWallMissions(): Promise<WallMission[]> {
  const db = getDb();
  const rows = await db.mission.findMany({
    where: { openToGuild: true, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      brief: {
        select: {
          action: {
            select: {
              kind: true,
              campaign: {
                select: { countryCode: true, country: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });
  return rows.map((row) =>
    toWallMission({
      id: row.id,
      title: row.title,
      createdAt: row.createdAt,
      actionKindLabel: kindLabel(row.brief.action.kind),
      marketName: row.brief.action.campaign.country.name,
      marketCode: row.brief.action.campaign.countryCode,
    }),
  );
}

/** Nombre de missions actuellement sur le mur (vitrine publique /la-guilde). */
export async function countWallMissions(): Promise<number> {
  const db = getDb();
  return db.mission.count({ where: { openToGuild: true, status: "OPEN" } });
}

export type MyApplicationRow = {
  id: string;
  status: ApplicationStatus;
  pitch: string;
  createdAt: Date;
  decidedAt: Date | null;
  mission: {
    title: string;
    kindLabel: string;
    market: string;
    /** Étape du circuit — utile au talent accepté (assignée → livrée → validée). */
    status: MissionStatus;
  };
};

/** Candidatures du talent, plus récentes d'abord — même projection que le mur. */
export async function listMyApplications(userId: string): Promise<MyApplicationRow[]> {
  const db = getDb();
  const rows = await db.missionApplication.findMany({
    where: { talent: { userId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      pitch: true,
      createdAt: true,
      decidedAt: true,
      mission: {
        select: {
          title: true,
          status: true,
          createdAt: true,
          id: true,
          brief: {
            select: {
              action: {
                select: {
                  kind: true,
                  campaign: {
                    select: { countryCode: true, country: { select: { name: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return rows.map((row) => {
    const wall = toWallMission({
      id: row.mission.id,
      title: row.mission.title,
      createdAt: row.mission.createdAt,
      actionKindLabel: kindLabel(row.mission.brief.action.kind),
      marketName: row.mission.brief.action.campaign.country.name,
      marketCode: row.mission.brief.action.campaign.countryCode,
    });
    return {
      id: row.id,
      status: applicationStatus(row.status),
      pitch: row.pitch,
      createdAt: row.createdAt,
      decidedAt: row.decidedAt,
      mission: {
        title: wall.title,
        kindLabel: wall.kindLabel,
        market: wall.market,
        status: row.mission.status as MissionStatus,
      },
    };
  });
}

export type MissionApplicationRow = {
  id: string;
  pitch: string;
  status: ApplicationStatus;
  createdAt: Date;
  decidedAt: Date | null;
  talent: {
    id: string;
    name: string;
    headline: string;
    skills: string[];
    city: string;
    countryCode: string;
    availability: TalentAvailability;
    visibility: TalentVisibility;
    portfolioUrl: string | null;
    /** Contact — servi UNIQUEMENT quand la candidature est ACCEPTED (mise en relation). */
    whatsapp: string | null;
  };
};

/**
 * Candidatures d'une mission, côté marque — tenancy-safe (mission de la
 * marque de session uniquement). Le WhatsApp du talent n'est servi qu'après
 * acceptation : la mise en relation suit la décision, jamais l'inverse.
 */
export async function listMissionApplications(
  brandId: string,
  missionId: string,
): Promise<MissionApplicationRow[]> {
  const db = getDb();
  const rows = await db.missionApplication.findMany({
    where: { missionId, mission: { brief: { action: { campaign: { brandId } } } } },
    orderBy: { createdAt: "asc" },
    include: { talent: { include: { user: { select: { name: true } } } } },
  });
  return rows.map((row) => {
    const status = applicationStatus(row.status);
    return {
      id: row.id,
      pitch: row.pitch,
      status,
      createdAt: row.createdAt,
      decidedAt: row.decidedAt,
      talent: {
        id: row.talent.id,
        name: row.talent.user.name?.trim() || row.talent.headline,
        headline: row.talent.headline,
        skills: row.talent.skills.slice(0, MAX_SKILLS),
        city: row.talent.city,
        countryCode: row.talent.countryCode,
        availability: row.talent.availability as TalentAvailability,
        visibility: row.talent.visibility as TalentVisibility,
        portfolioUrl: row.talent.portfolioUrl,
        whatsapp: status === "ACCEPTED" ? row.talent.whatsapp : null,
      },
    };
  });
}

/** Ids des missions du mur où ce talent a déjà candidaté (état des boutons). */
export async function listMyAppliedMissionIds(userId: string): Promise<Set<string>> {
  const db = getDb();
  const rows = await db.missionApplication.findMany({
    where: { talent: { userId } },
    select: { missionId: true },
  });
  return new Set(rows.map((row) => row.missionId));
}
