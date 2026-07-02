import { Prisma } from "@prisma/client";
import type { Brief, Campaign, CampaignAction, Country, Mission } from "@prisma/client";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  buildBriefDraft,
  canAddAction,
  canBriefAction,
  canEditBrief,
  canLaunchCampaign,
  canSplitBrief,
  canTransitionMission,
  canValidateBrief,
  scaleCostByCostOfLiving,
  type BriefContent,
  type MissionStatus,
} from "@/domain/campaign";
import { insertPayout, prepareMissionPayout } from "./payouts";
import { logAudit } from "./audit";

/**
 * Campagnes & production — le pipeline cockpit (WP-008), essence d'ADR-0119/0120
 * legacy simplifiée : Campagne → Actions → Briefs → Missions, chaque étape
 * franchie par une gate explicite (les prédicats vivent dans
 * `src/domain/campaign.ts`, purs et testés sans DB).
 *
 * Doctrine :
 *   - coûts d'action JAMAIS en dur : lookup `ZoneIndex` famille "action-cost"
 *     (base marché CM, portée du catalogue legacy ADR-0093) mise à l'échelle
 *     du marché de la campagne par la famille "cost-of-living". Trou de
 *     référentiel → `estimated: false` + raison : l'action est « à estimer »,
 *     aucun montant inventé (pattern market.ts).
 *   - mutation = transaction + `AuditLog` chaîné (pattern finance.ts), flips
 *     de statut atomiques (`updateMany` conditionnel — une gate ne se
 *     franchit qu'une fois, même sous double-clic).
 *   - tenancy : chaque fonction prend le `brandId` de la session et vérifie
 *     que l'entité visée appartient bien à cette marque (id forgé = introuvable).
 */

// ── Référentiel des types d'action (identifiants + libellés — AUCUN montant ici) ──

/**
 * Clés du référentiel de coûts (`ZoneIndex family="action-cost"`, cf.
 * prisma/seed.mjs — archétypes portés du catalogue legacy ADR-0093) +
 * `custom` pour une action hors référentiel (coût à estimer par l'opérateur).
 */
export const ACTION_KIND_KEYS = [
  "photo_session_half_day",
  "video_shoot_1day",
  "social_content_batch",
  "radio_spot_30s",
  "tv_spot_30s",
  "event_activation_day",
  "ooh_campaign_panel",
  "influencer_post",
  "print_kv",
  "pr_press_event",
  "packaging_design",
  "landing_page",
  "custom",
] as const;

export type ActionKind = (typeof ACTION_KIND_KEYS)[number];

/** Libellés FR portés du catalogue legacy (catalog.ts, ADR-0093). */
export const ACTION_KIND_LABELS: Record<ActionKind, string> = {
  photo_session_half_day: "Séance photo (demi-journée)",
  video_shoot_1day: "Tournage vidéo (1 jour)",
  social_content_batch: "Batch contenu social (10 posts)",
  radio_spot_30s: "Spot radio 30s",
  tv_spot_30s: "Spot TV 30s",
  event_activation_day: "Activation terrain (1 jour)",
  ooh_campaign_panel: "Affichage OOH (panneau / mois)",
  influencer_post: "Post influenceur",
  print_kv: "Key visual print",
  pr_press_event: "Événement presse / RP",
  packaging_design: "Design packaging",
  landing_page: "Landing page",
  custom: "Autre (hors référentiel)",
};

export const actionKindSchema = z.enum(ACTION_KIND_KEYS);

export const ACTION_COST_FAMILY = "action-cost";
export const COST_OF_LIVING_FAMILY = "cost-of-living";
export const COST_OF_LIVING_KEY = "general";

/**
 * Devises interchangeables sans table forex : le franc CFA UEMOA (XOF) et
 * CEMAC (XAF) sont à parité fixe (tous deux arrimés à l'euro au même taux —
 * fait monétaire réel, déjà acté par le seed pricing legacy « XOF ≡ XAF,
 * parité »). Toute autre conversion exigerait une famille "forex" seedée :
 * en son absence, l'estimation est honnêtement refusée.
 */
const CFA_CURRENCIES = new Set(["XOF", "XAF"]);

// ── Erreur métier (messages FR prêts à afficher) ───────────────────────

export type CampaignErrorCode =
  | "CAMPAIGN_NOT_FOUND"
  | "ACTION_NOT_FOUND"
  | "BRIEF_NOT_FOUND"
  | "MISSION_NOT_FOUND"
  | "UNKNOWN_MARKET"
  | "GATE_REFUSED";

export class CampaignError extends Error {
  constructor(
    public readonly code: CampaignErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CampaignError";
  }
}

function gateRefused(reason: string): CampaignError {
  return new CampaignError("GATE_REFUSED", reason);
}

// ── Schémas de frontière (server actions → service) ────────────────────

export const createCampaignSchema = z.object({
  name: z.string().trim().min(2, "Nommez la campagne (2 caractères minimum).").max(120),
  objective: z
    .string()
    .trim()
    .min(4, "Déclarez l'objectif de la campagne (4 caractères minimum).")
    .max(500),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Choisissez le marché de la campagne."),
});

export const addActionSchema = z.object({
  name: z.string().trim().min(2, "Nommez l'action (2 caractères minimum).").max(120),
  kind: actionKindSchema,
});

/** Contenu structuré du brief — champs libres bornés, tous optionnels ici :
 * c'est la gate de VALIDATION qui exige objectif + livrable (domain). */
export const briefContentSchema = z.object({
  objectif: z.string().trim().max(2000).default(""),
  livrable: z.string().trim().max(2000).default(""),
  specs: z.string().trim().max(2000).default(""),
  ton: z.string().trim().max(2000).default(""),
  echeance: z.string().trim().max(200).default(""),
  contexte: z.string().trim().max(2000).default(""),
});

export const missionTitlesSchema = z
  .array(z.string().trim().min(2, "Chaque mission doit être nommée (2 caractères minimum).").max(160))
  .min(1, "Déclarez au moins une mission (une par ligne).")
  .max(20, "20 missions maximum par éclatement — découpez le brief sinon.");

export const assigneeSchema = z
  .string()
  .trim()
  .min(2, "Nommez le talent assigné (2 caractères minimum).")
  .max(120);

// ── Estimation de coût (pur lookup DB — jamais de montant inventé) ─────

export type ActionCostEstimate =
  | { estimated: true; amount: number; currency: string; source: string }
  | { estimated: false; reason: string };

/** Dernière ligne ZoneIndex valide à date (même mécanique que market.ts). */
async function findIndex(family: string, countryCode: string, key: string) {
  const db = getDb();
  const now = new Date();
  return db.zoneIndex.findFirst({
    where: {
      family,
      countryCode,
      key,
      validFrom: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
    },
    orderBy: { validFrom: "desc" },
    select: { value: true, source: true, countryCode: true },
  });
}

/** Marché de base du référentiel action-cost (baseZoneCode du catalogue legacy). */
export const ACTION_COST_BASE_MARKET = "CM";

/**
 * Estime le coût d'une action pour un marché :
 *   1. ligne "action-cost" directe du marché → montant tel quel, devise du pays ;
 *   2. sinon ligne du marché de base (CM) × ratio cost-of-living
 *      (marché / base), si le marché est en franc CFA (parité XOF/XAF) ;
 *   3. sinon — kind `custom`, référentiel non seedé, indice manquant ou devise
 *      non convertible — `estimated: false` avec la raison : l'action est
 *      honnêtement « à estimer », jamais chiffrée par invention.
 */
export async function estimateActionCost(
  kind: ActionKind,
  countryCode: string,
): Promise<ActionCostEstimate> {
  if (kind === "custom") {
    return {
      estimated: false,
      reason: "Type d'action hors référentiel — coût à estimer par l'opérateur.",
    };
  }

  const db = getDb();
  const country = await db.country.findUnique({
    where: { code: countryCode },
    select: { currency: true, name: true },
  });
  if (!country) {
    return {
      estimated: false,
      reason: `Marché ${countryCode} absent du référentiel pays — coût à estimer.`,
    };
  }

  // 1. Ligne directe du marché (posée par l'opérateur ou un seed futur).
  const direct = await findIndex(ACTION_COST_FAMILY, countryCode, kind);
  if (direct) {
    return {
      estimated: true,
      amount: Math.round(direct.value),
      currency: country.currency,
      source: `${direct.source} — ligne directe marché ${countryCode}`,
    };
  }

  // 2. Ligne du marché de base, mise à l'échelle cost-of-living.
  const base = await findIndex(ACTION_COST_FAMILY, ACTION_COST_BASE_MARKET, kind);
  if (!base) {
    return {
      estimated: false,
      reason:
        "Référentiel de coûts d'action non seedé pour ce type — exécuter prisma/seed.mjs ou estimer manuellement.",
    };
  }
  if (!CFA_CURRENCIES.has(country.currency)) {
    return {
      estimated: false,
      reason:
        `Marché ${country.name} en ${country.currency} : conversion depuis le franc CFA non seedée ` +
        "(famille forex absente) — coût à estimer.",
    };
  }
  const colTarget = await findIndex(COST_OF_LIVING_FAMILY, countryCode, COST_OF_LIVING_KEY);
  const colBase = await findIndex(COST_OF_LIVING_FAMILY, ACTION_COST_BASE_MARKET, COST_OF_LIVING_KEY);
  if (!colTarget || !colBase) {
    return {
      estimated: false,
      reason: `Indice coût de la vie non seedé pour ${!colTarget ? country.name : "le marché de base"} — coût à estimer.`,
    };
  }
  const amount = scaleCostByCostOfLiving(base.value, colTarget.value, colBase.value);
  if (amount === null) {
    return {
      estimated: false,
      reason: "Indices coût de la vie inutilisables (valeur nulle ou négative) — coût à estimer.",
    };
  }
  return {
    estimated: true,
    amount,
    currency: country.currency,
    source:
      `${base.source} — base ${ACTION_COST_BASE_MARKET} × cost-of-living ` +
      `${countryCode}/${ACTION_COST_BASE_MARKET} (${colTarget.value}/${colBase.value}), parité XOF/XAF`,
  };
}

// ── Chargeurs tenancy-safe (id forgé ⇒ introuvable) ────────────────────

type CampaignRef = Campaign & { brand: { workspaceId: string }; country: Country };

async function requireCampaign(brandId: string, campaignId: string): Promise<CampaignRef> {
  const db = getDb();
  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, brandId },
    include: { brand: { select: { workspaceId: true } }, country: true },
  });
  if (!campaign) {
    throw new CampaignError("CAMPAIGN_NOT_FOUND", "Campagne introuvable dans cet espace marque.");
  }
  return campaign;
}

type ActionRef = CampaignAction & { campaign: CampaignRef };

async function requireAction(brandId: string, actionId: string): Promise<ActionRef> {
  const db = getDb();
  const action = await db.campaignAction.findFirst({
    where: { id: actionId, campaign: { brandId } },
    include: {
      campaign: { include: { brand: { select: { workspaceId: true } }, country: true } },
    },
  });
  if (!action) {
    throw new CampaignError("ACTION_NOT_FOUND", "Action introuvable dans cet espace marque.");
  }
  return action;
}

type BriefRef = Brief & { action: ActionRef };

async function requireBrief(brandId: string, briefId: string): Promise<BriefRef> {
  const db = getDb();
  const brief = await db.brief.findFirst({
    where: { id: briefId, action: { campaign: { brandId } } },
    include: {
      action: {
        include: {
          campaign: { include: { brand: { select: { workspaceId: true } }, country: true } },
        },
      },
    },
  });
  if (!brief) {
    throw new CampaignError("BRIEF_NOT_FOUND", "Brief introuvable dans cet espace marque.");
  }
  return brief;
}

type MissionRef = Mission & { brief: BriefRef };

async function requireMission(brandId: string, missionId: string): Promise<MissionRef> {
  const db = getDb();
  const mission = await db.mission.findFirst({
    where: { id: missionId, brief: { action: { campaign: { brandId } } } },
    include: {
      brief: {
        include: {
          action: {
            include: {
              campaign: { include: { brand: { select: { workspaceId: true } }, country: true } },
            },
          },
        },
      },
    },
  });
  if (!mission) {
    throw new CampaignError("MISSION_NOT_FOUND", "Mission introuvable dans cet espace marque.");
  }
  return mission;
}

/** Contenu Json de brief relu depuis la DB → record sûr. */
export function briefContentRecord(value: unknown): BriefContent {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

// ── Mutations : campagne ───────────────────────────────────────────────

export type CreateCampaignInput = {
  brandId: string;
  name: string;
  objective: string;
  countryCode: string;
  actorId: string;
};

/**
 * Crée le cadre de campagne (nom, objectif, marché) en statut DRAFT.
 * Le marché doit exister dans le référentiel pays (aucun pays inventé).
 * Transaction : Campaign + AuditLog `campaign.create`.
 */
export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const { brandId, name, objective, countryCode, actorId } = input;
  const db = getDb();

  const brand = await db.brand.findUnique({
    where: { id: brandId },
    select: { id: true, workspaceId: true },
  });
  if (!brand) {
    throw new CampaignError("CAMPAIGN_NOT_FOUND", "Marque introuvable — impossible de créer la campagne.");
  }
  const country = await db.country.findUnique({ where: { code: countryCode } });
  if (!country) {
    throw new CampaignError(
      "UNKNOWN_MARKET",
      `Marché « ${countryCode} » absent du référentiel pays — choisissez un marché seedé.`,
    );
  }

  return db.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: { brandId, name, objective, countryCode, status: "DRAFT" },
    });
    await logAudit(
      {
        workspaceId: brand.workspaceId,
        actorId,
        action: "campaign.create",
        entity: "Campaign",
        entityId: campaign.id,
        payload: { name, objective, countryCode },
      },
      tx,
    );
    return campaign;
  });
}

export type AddActionInput = {
  brandId: string;
  campaignId: string;
  name: string;
  kind: ActionKind;
  actorId: string;
};

export type AddActionResult = { action: CampaignAction; estimate: ActionCostEstimate };

/**
 * Ajoute une action (frame de production) à la campagne. Le coût est estimé
 * à la création par lookup référentiel (marché de la campagne) — trou de
 * référentiel ⇒ action « à estimer » (estimatedCost null), jamais un montant
 * inventé. Transaction : CampaignAction + AuditLog `campaign.action.add`.
 */
export async function addAction(input: AddActionInput): Promise<AddActionResult> {
  const { brandId, campaignId, name, kind, actorId } = input;
  const campaign = await requireCampaign(brandId, campaignId);

  const gate = canAddAction(campaign.status);
  if (!gate.ok) throw gateRefused(gate.reason);

  // Lecture référentiel AVANT la transaction (non mutante).
  const estimate = await estimateActionCost(kind, campaign.countryCode);

  const db = getDb();
  const action = await db.$transaction(async (tx) => {
    const created = await tx.campaignAction.create({
      data: {
        campaignId: campaign.id,
        name,
        kind,
        status: "PLANNED",
        estimatedCost: estimate.estimated ? estimate.amount : null,
        costCurrency: estimate.estimated ? estimate.currency : null,
        costSource: estimate.estimated ? estimate.source : null,
      },
    });
    await logAudit(
      {
        workspaceId: campaign.brand.workspaceId,
        actorId,
        action: "campaign.action.add",
        entity: "CampaignAction",
        entityId: created.id,
        payload: {
          campaignId: campaign.id,
          name,
          kind,
          estimated: estimate.estimated,
          ...(estimate.estimated
            ? { amount: estimate.amount, currency: estimate.currency, source: estimate.source }
            : { reason: estimate.reason }),
        },
      },
      tx,
    );
    return created;
  });

  return { action, estimate };
}

export type CampaignGateInput = { brandId: string; campaignId: string; actorId: string };

/**
 * Gate « lancer la production » : DRAFT → ACTIVE, exige au moins une action
 * non annulée. Flip atomique (une campagne ne se lance qu'une fois) +
 * AuditLog `campaign.launch`.
 */
export async function launchCampaign(input: CampaignGateInput): Promise<Campaign> {
  const { brandId, campaignId, actorId } = input;
  const campaign = await requireCampaign(brandId, campaignId);
  const db = getDb();

  const activeActions = await db.campaignAction.count({
    where: { campaignId: campaign.id, status: { not: "CANCELLED" } },
  });
  const gate = canLaunchCampaign(campaign.status, activeActions);
  if (!gate.ok) throw gateRefused(gate.reason);

  return db.$transaction(async (tx) => {
    const flipped = await tx.campaign.updateMany({
      where: { id: campaign.id, status: "DRAFT" },
      data: { status: "ACTIVE", launchedAt: new Date() },
    });
    if (flipped.count === 0) {
      throw gateRefused("La production de cette campagne est déjà lancée.");
    }
    await logAudit(
      {
        workspaceId: campaign.brand.workspaceId,
        actorId,
        action: "campaign.launch",
        entity: "Campaign",
        entityId: campaign.id,
        payload: { actions: activeActions },
      },
      tx,
    );
    return tx.campaign.findUniqueOrThrow({ where: { id: campaign.id } });
  });
}

/** Archive la campagne (DRAFT ou ACTIVE → ARCHIVED) — plus aucune écriture ensuite. */
export async function archiveCampaign(input: CampaignGateInput): Promise<Campaign> {
  const { brandId, campaignId, actorId } = input;
  const campaign = await requireCampaign(brandId, campaignId);
  const db = getDb();

  return db.$transaction(async (tx) => {
    const flipped = await tx.campaign.updateMany({
      where: { id: campaign.id, status: { in: ["DRAFT", "ACTIVE"] } },
      data: { status: "ARCHIVED" },
    });
    if (flipped.count === 0) {
      throw gateRefused("Cette campagne est déjà archivée.");
    }
    await logAudit(
      {
        workspaceId: campaign.brand.workspaceId,
        actorId,
        action: "campaign.archive",
        entity: "Campaign",
        entityId: campaign.id,
        payload: { from: campaign.status },
      },
      tx,
    );
    return tx.campaign.findUniqueOrThrow({ where: { id: campaign.id } });
  });
}

// ── Mutations : action → brief (gate ADR-0120) ─────────────────────────

export type BriefActionInput = { brandId: string; actionId: string; actorId: string };

/**
 * Gate « transformer en brief » : campagne ACTIVE + action PLANNED. Transaction :
 * flip atomique PLANNED → BRIEFED + Brief DRAFT pré-rempli depuis les données
 * déclarées du cadre (buildBriefDraft, déterministe) + AuditLog `brief.create`.
 */
export async function createBriefFromAction(input: BriefActionInput): Promise<Brief> {
  const { brandId, actionId, actorId } = input;
  const action = await requireAction(brandId, actionId);

  const gate = canBriefAction(action.campaign.status, action.status);
  if (!gate.ok) throw gateRefused(gate.reason);

  const draft = buildBriefDraft({
    campaignName: action.campaign.name,
    campaignObjective: action.campaign.objective,
    actionName: action.name,
    actionKindLabel:
      ACTION_KIND_LABELS[actionKindSchema.safeParse(action.kind).data ?? "custom"],
    marketLabel: `${action.campaign.country.name} (${action.campaign.countryCode})`,
  });

  const db = getDb();
  return db.$transaction(async (tx) => {
    const flipped = await tx.campaignAction.updateMany({
      where: { id: action.id, status: "PLANNED" },
      data: { status: "BRIEFED" },
    });
    if (flipped.count === 0) {
      throw gateRefused("Cette action a déjà son brief — ouvrez-le plutôt que d'en créer un doublon.");
    }
    const brief = await tx.brief.create({
      data: {
        actionId: action.id,
        title: draft.title,
        content: draft.content as Prisma.InputJsonValue,
        status: "DRAFT",
      },
    });
    await logAudit(
      {
        workspaceId: action.campaign.brand.workspaceId,
        actorId,
        action: "brief.create",
        entity: "Brief",
        entityId: brief.id,
        payload: { actionId: action.id, campaignId: action.campaignId, title: draft.title },
      },
      tx,
    );
    return brief;
  });
}

// ── Mutations : brief ──────────────────────────────────────────────────

export type UpdateBriefInput = {
  brandId: string;
  briefId: string;
  content: z.infer<typeof briefContentSchema>;
  actorId: string;
};

/** Édite le contenu structuré d'un brief BROUILLON (version++, audité). */
export async function updateBriefContent(input: UpdateBriefInput): Promise<Brief> {
  const { brandId, briefId, content, actorId } = input;
  const brief = await requireBrief(brandId, briefId);

  const gate = canEditBrief(brief.status);
  if (!gate.ok) throw gateRefused(gate.reason);

  const db = getDb();
  return db.$transaction(async (tx) => {
    const updated = await tx.brief.update({
      where: { id: brief.id },
      data: { content: content as Prisma.InputJsonValue, version: brief.version + 1 },
    });
    await logAudit(
      {
        workspaceId: brief.action.campaign.brand.workspaceId,
        actorId,
        action: "brief.update",
        entity: "Brief",
        entityId: brief.id,
        payload: { version: updated.version },
      },
      tx,
    );
    return updated;
  });
}

export type BriefGateInput = { brandId: string; briefId: string; actorId: string };

/**
 * Gate « valider le brief » : DRAFT + objectif/livrable renseignés → VALIDATED
 * (flip atomique, validatedAt). AuditLog `brief.validate`.
 */
export async function validateBrief(input: BriefGateInput): Promise<Brief> {
  const { brandId, briefId, actorId } = input;
  const brief = await requireBrief(brandId, briefId);

  const gate = canValidateBrief(brief.status, briefContentRecord(brief.content));
  if (!gate.ok) throw gateRefused(gate.reason);

  const db = getDb();
  return db.$transaction(async (tx) => {
    const flipped = await tx.brief.updateMany({
      where: { id: brief.id, status: "DRAFT" },
      data: { status: "VALIDATED", validatedAt: new Date() },
    });
    if (flipped.count === 0) {
      throw gateRefused("Ce brief est déjà validé — il ne se revalide pas.");
    }
    await logAudit(
      {
        workspaceId: brief.action.campaign.brand.workspaceId,
        actorId,
        action: "brief.validate",
        entity: "Brief",
        entityId: brief.id,
        payload: { version: brief.version },
      },
      tx,
    );
    return tx.brief.findUniqueOrThrow({ where: { id: brief.id } });
  });
}

export type SplitBriefInput = {
  brandId: string;
  briefId: string;
  titles: string[];
  actorId: string;
};

/**
 * Gate « éclater en missions » : brief VALIDATED uniquement. Crée une mission
 * OPEN par titre déclaré. Transaction : Missions + AuditLog `brief.split`.
 */
export async function createMissionsFromBrief(input: SplitBriefInput): Promise<Mission[]> {
  const { brandId, briefId, titles, actorId } = input;
  const brief = await requireBrief(brandId, briefId);

  const gate = canSplitBrief(brief.status);
  if (!gate.ok) throw gateRefused(gate.reason);

  const db = getDb();
  return db.$transaction(async (tx) => {
    const missions: Mission[] = [];
    for (const title of titles) {
      missions.push(
        await tx.mission.create({ data: { briefId: brief.id, title, status: "OPEN" } }),
      );
    }
    await logAudit(
      {
        workspaceId: brief.action.campaign.brand.workspaceId,
        actorId,
        action: "brief.split",
        entity: "Brief",
        entityId: brief.id,
        payload: { missionIds: missions.map((m) => m.id), titles },
      },
      tx,
    );
    return missions;
  });
}

// ── Mutations : mission (OPEN → ASSIGNED → DELIVERED → VALIDATED) ──────

type MissionTransitionSpec = {
  to: MissionStatus;
  auditAction: string;
  data: (now: Date) => Prisma.MissionUpdateManyMutationInput;
  auditPayload?: Prisma.InputJsonValue;
};

/** Transition atomique de mission : gate domaine + flip conditionnel + audit. */
async function transitionMission(
  brandId: string,
  missionId: string,
  actorId: string,
  spec: MissionTransitionSpec,
): Promise<Mission> {
  const mission = await requireMission(brandId, missionId);

  const gate = canTransitionMission(mission.status as MissionStatus, spec.to);
  if (!gate.ok) throw gateRefused(gate.reason);

  const db = getDb();
  return db.$transaction(async (tx) => {
    const flipped = await tx.mission.updateMany({
      where: { id: mission.id, status: mission.status },
      data: { ...spec.data(new Date()), status: spec.to },
    });
    if (flipped.count === 0) {
      throw gateRefused("Cette mission vient de changer d'état — rechargez la page.");
    }
    await logAudit(
      {
        workspaceId: mission.brief.action.campaign.brand.workspaceId,
        actorId,
        action: spec.auditAction,
        entity: "Mission",
        entityId: mission.id,
        payload: spec.auditPayload,
      },
      tx,
    );
    return tx.mission.findUniqueOrThrow({ where: { id: mission.id } });
  });
}

export type AssignMissionInput = {
  brandId: string;
  missionId: string;
  assignee: string;
  actorId: string;
};

/** OPEN → ASSIGNED : déclare le talent assigné (nom/contact — guilde = WP-011). */
export async function assignMission(input: AssignMissionInput): Promise<Mission> {
  return transitionMission(input.brandId, input.missionId, input.actorId, {
    to: "ASSIGNED",
    auditAction: "mission.assign",
    data: (now) => ({ assignee: input.assignee, assignedAt: now }),
    auditPayload: { assignee: input.assignee },
  });
}

export type MissionGateInput = { brandId: string; missionId: string; actorId: string };

/** ASSIGNED → DELIVERED : le talent a livré. */
export async function deliverMission(input: MissionGateInput): Promise<Mission> {
  return transitionMission(input.brandId, input.missionId, input.actorId, {
    to: "DELIVERED",
    auditAction: "mission.deliver",
    data: (now) => ({ deliveredAt: now }),
  });
}

export type ValidateMissionInput = MissionGateInput & {
  /** Montant brut saisi par la marque au formulaire — null = dériver du tarif (WP-024). */
  declaredGross?: number | null;
};

/**
 * DELIVERED → VALIDATED : livraison validée par l'opérateur (fin du circuit).
 *
 * WP-024 — si la mission a été gagnée VIA LA GUILDE (assigneeTalentId posé),
 * la validation crée l'ordre de gain `TalentPayout` PENDING dans la MÊME
 * transaction que le flip : brut = montant déclaré par la marque, sinon
 * dailyRate × jours si dérivable (sinon la validation est refusée avec la
 * marche à suivre) ; taux = référentiel ZoneIndex "commission" — jamais en
 * dur, jamais inventé. Mission assignée hors Guilde (nom déclaré) : la
 * validation passe sans ordre, il n'y a pas de compte talent à créditer.
 */
export async function validateMission(input: ValidateMissionInput): Promise<Mission> {
  const { brandId, missionId, actorId } = input;
  const mission = await requireMission(brandId, missionId);

  const gate = canTransitionMission(mission.status as MissionStatus, "VALIDATED");
  if (!gate.ok) throw gateRefused(gate.reason);

  const workspaceId = mission.brief.action.campaign.brand.workspaceId;

  // Ordre de gain préparé AVANT la transaction (lectures référentiel + talent,
  // non mutantes) — null si la mission n'a pas de talent Guilde.
  const payoutPlan = await prepareMissionPayout({
    mission: {
      id: mission.id,
      assigneeTalentId: mission.assigneeTalentId,
      assignedAt: mission.assignedAt,
      deliveredAt: mission.deliveredAt,
    },
    workspaceId,
    declaredGross: input.declaredGross ?? null,
  });

  const db = getDb();
  try {
    return await db.$transaction(async (tx) => {
      const flipped = await tx.mission.updateMany({
        where: { id: mission.id, status: mission.status },
        data: { status: "VALIDATED", validatedAt: new Date() },
      });
      if (flipped.count === 0) {
        throw gateRefused("Cette mission vient de changer d'état — rechargez la page.");
      }
      await logAudit(
        {
          workspaceId,
          actorId,
          action: "mission.validate",
          entity: "Mission",
          entityId: mission.id,
          payload: payoutPlan
            ? {
                payout: {
                  basis: payoutPlan.basis,
                  amountGross: payoutPlan.amountGross,
                  amountNet: payoutPlan.amountNet,
                  currency: payoutPlan.currency,
                },
              }
            : undefined,
        },
        tx,
      );
      if (payoutPlan) {
        await insertPayout(tx, payoutPlan, actorId);
      }
      return tx.mission.findUniqueOrThrow({ where: { id: mission.id } });
    });
  } catch (err) {
    // Course perdue sur l'unicité missionId de TalentPayout (état incohérent
    // ou double validation concurrente) — message actionnable, pas de 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw gateRefused("Un ordre de gain existe déjà pour cette mission — rechargez la page.");
    }
    throw err;
  }
}

// ── Lectures (pages /campagnes et /missions) ───────────────────────────

/** Agrégat budget d'une liste d'actions : total estimé + nombre « à estimer ». */
export function costSummary(
  actions: ReadonlyArray<Pick<CampaignAction, "status" | "estimatedCost" | "costCurrency">>,
): { total: number; currency: string | null; unestimated: number } {
  let total = 0;
  let currency: string | null = null;
  let unestimated = 0;
  for (const action of actions) {
    if (action.status === "CANCELLED") continue;
    if (action.estimatedCost === null) {
      unestimated += 1;
    } else {
      total += action.estimatedCost;
      currency = currency ?? action.costCurrency;
    }
  }
  return { total, currency, unestimated };
}

export type CampaignListRow = Campaign & {
  country: Country;
  actions: Pick<CampaignAction, "status" | "estimatedCost" | "costCurrency">[];
};

/** Campagnes de la marque, plus récentes d'abord, avec leurs actions (agrégats UI). */
export async function listCampaigns(brandId: string): Promise<CampaignListRow[]> {
  const db = getDb();
  return db.campaign.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    include: {
      country: true,
      actions: { select: { status: true, estimatedCost: true, costCurrency: true } },
    },
  });
}

export type CampaignDetail = Campaign & {
  country: Country;
  actions: (CampaignAction & {
    briefs: (Pick<Brief, "id" | "status" | "title"> & {
      missions: Pick<Mission, "id" | "status">[];
    })[];
  })[];
};

/** Détail complet d'une campagne (actions → briefs → missions) — tenancy-safe. */
export async function getCampaignDetail(
  brandId: string,
  campaignId: string,
): Promise<CampaignDetail | null> {
  const db = getDb();
  return db.campaign.findFirst({
    where: { id: campaignId, brandId },
    include: {
      country: true,
      actions: {
        orderBy: { createdAt: "asc" },
        include: {
          briefs: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              status: true,
              title: true,
              missions: { select: { id: true, status: true } },
            },
          },
        },
      },
    },
  });
}

export type ActionDetail = CampaignAction & {
  campaign: Campaign & { country: Country };
  briefs: (Brief & { missions: Pick<Mission, "id" | "status" | "title">[] })[];
};

export async function getActionDetail(
  brandId: string,
  actionId: string,
): Promise<ActionDetail | null> {
  const db = getDb();
  return db.campaignAction.findFirst({
    where: { id: actionId, campaign: { brandId } },
    include: {
      campaign: { include: { country: true } },
      briefs: {
        orderBy: { createdAt: "asc" },
        include: { missions: { select: { id: true, status: true, title: true } } },
      },
    },
  });
}

export type BriefDetail = Brief & {
  action: CampaignAction & { campaign: Campaign & { country: Country } };
  missions: Mission[];
};

export async function getBriefDetail(
  brandId: string,
  briefId: string,
): Promise<BriefDetail | null> {
  const db = getDb();
  return db.brief.findFirst({
    where: { id: briefId, action: { campaign: { brandId } } },
    include: {
      action: { include: { campaign: { include: { country: true } } } },
      missions: { orderBy: { createdAt: "asc" } },
    },
  });
}

export type MissionDetail = Mission & {
  brief: Brief & { action: CampaignAction & { campaign: Campaign & { country: Country } } };
};

export async function getMissionDetail(
  brandId: string,
  missionId: string,
): Promise<MissionDetail | null> {
  const db = getDb();
  return db.mission.findFirst({
    where: { id: missionId, brief: { action: { campaign: { brandId } } } },
    include: {
      brief: { include: { action: { include: { campaign: { include: { country: true } } } } } },
    },
  });
}

export type MissionListRow = Mission & {
  brief: Pick<Brief, "id" | "title"> & {
    action: Pick<CampaignAction, "id" | "name"> & {
      campaign: Pick<Campaign, "id" | "name">;
    };
  };
  /** Candidatures Guilde reçues (WP-011) — affiché sur la vue /missions. */
  _count: { applications: number };
};

/** Toutes les missions de la marque (vue /missions), plus récentes d'abord. */
export async function listMissions(brandId: string): Promise<MissionListRow[]> {
  const db = getDb();
  return db.mission.findMany({
    where: { brief: { action: { campaign: { brandId } } } },
    orderBy: { createdAt: "desc" },
    include: {
      brief: {
        select: {
          id: true,
          title: true,
          action: {
            select: {
              id: true,
              name: true,
              campaign: { select: { id: true, name: true } },
            },
          },
        },
      },
      _count: { select: { applications: true } },
    },
  });
}

/** Marchés proposables à la création de campagne (référentiel pays seedé). */
export async function listMarkets(): Promise<Country[]> {
  const db = getDb();
  return db.country.findMany({ orderBy: { name: "asc" } });
}
