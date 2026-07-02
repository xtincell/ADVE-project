import type { Prisma, TalentPayout } from "@prisma/client";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  canTransitionPayout,
  computeMissionDays,
  computePayoutBreakdown,
  estimateGrossFromDailyRate,
  normalizeCommissionRate,
  PAYOUT_METHODS,
  summarizePayouts,
  type PayoutMethod,
  type PayoutStatus,
  type PayoutSummary,
} from "@/domain/payout";
import { isPlaceholderSource } from "./market";
import { logAudit } from "./audit";

/**
 * Commissions talents — les ordres de gain de la Guilde (WP-024, la boucle
 * guilde → mobile money qui clôt le funnel). Les calculs purs vivent dans
 * `src/domain/payout.ts` ; ici la plomberie DB, le référentiel et l'audit.
 *
 * Doctrine :
 *   - taux de commission JAMAIS en dur : lookup `ZoneIndex` famille
 *     "commission" clé "guild.rate" (scope GLOBAL — un taux Guilde en V1),
 *     seedé par prisma/seed.mjs, éditable dans /admin/referentiels. Ligne
 *     absente ou valeur hors [0, 1) = trou de référentiel → la validation de
 *     mission est REFUSÉE avec la marche à suivre, jamais un taux inventé.
 *   - brut : montant DÉCLARÉ par la marque au formulaire de validation s'il
 *     est saisi, sinon dailyRate × jours (assignedAt → deliveredAt) quand
 *     c'est dérivable — sinon refus honnête demandant la saisie.
 *   - devise : celle du pays du profil talent (référentiel Country) — c'est
 *     la devise du tarif déclaré et du reversement momo.
 *   - mutation = transaction + `AuditLog` chaîné (pattern finance.ts), flips
 *     de statut atomiques (`updateMany` conditionnel).
 *   - l'ordre est créé dans LA MÊME transaction que le flip DELIVERED →
 *     VALIDATED de la mission (src/server/campaigns.ts) — pas de gain sans
 *     validation, pas de validation Guilde sans gain tracé.
 */

// ── Référentiel commission (clé de lecture — AUCUN taux ici) ────────────

export const COMMISSION_FAMILY = "commission";
/** `ZoneIndex.countryCode` porte le scope GLOBAL (même convention que "pricing" ↔ zones). */
export const COMMISSION_SCOPE_GLOBAL = "GLOBAL";
export const GUILD_COMMISSION_KEY = "guild.rate";

export type GuildCommissionRate = {
  /** Fraction du brut retenue (0.15 = 15 %), vérifiée dans [0, 1). */
  value: number;
  source: string;
  /** true si la ligne seedée attend une confirmation opérateur. */
  placeholder: boolean;
};

/**
 * Taux de commission Guilde en vigueur — dernière ligne valide à date. Null si
 * la famille n'est pas seedée OU si la valeur stockée n'est pas une fraction
 * exploitable (ex. « 15 » saisi au lieu de « 0.15 ») : un trou, jamais un taux.
 */
export async function getGuildCommissionRate(): Promise<GuildCommissionRate | null> {
  const db = getDb();
  const now = new Date();
  const row = await db.zoneIndex.findFirst({
    where: {
      family: COMMISSION_FAMILY,
      countryCode: COMMISSION_SCOPE_GLOBAL,
      key: GUILD_COMMISSION_KEY,
      validFrom: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
    },
    orderBy: { validFrom: "desc" },
    select: { value: true, source: true },
  });
  if (!row) return null;
  const value = normalizeCommissionRate(row.value);
  if (value === null) return null;
  return { value, source: row.source, placeholder: isPlaceholderSource(row.source) };
}

// ── Erreur métier (messages FR prêts à afficher) ───────────────────────

export type PayoutErrorCode =
  | "RATE_UNAVAILABLE"
  | "AMOUNT_REQUIRED"
  | "INVALID_AMOUNT"
  | "TALENT_NOT_FOUND"
  | "PAYOUT_NOT_FOUND"
  | "GATE_REFUSED";

export class PayoutError extends Error {
  constructor(
    public readonly code: PayoutErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PayoutError";
  }
}

function gateRefused(reason: string): PayoutError {
  return new PayoutError("GATE_REFUSED", reason);
}

// ── Schémas de frontière (server actions → service) ────────────────────

/**
 * Montant brut saisi par la marque au formulaire de validation — optionnel :
 * vide = null (l'estimation dailyRate × jours prend le relais si dérivable).
 * Unité mineure de la devise du talent, 9 chiffres max (garde int32).
 */
export const declaredGrossSchema = z
  .string()
  .trim()
  .default("")
  .transform((value) => value.replace(/\s/g, "")) // tolère « 450 000 »
  .refine((value) => /^\d{0,9}$/.test(value), {
    message: "Montant invalide — un montant en chiffres (ex. 250000), sans devise ni séparateur.",
  })
  .transform((value) => (value === "" ? null : Number.parseInt(value, 10)))
  .refine((value) => value === null || value > 0, {
    message: "Montant invalide — un entier positif, ou laissez vide pour retenir l'estimation.",
  });

export const payoutMethodSchema = z.enum(PAYOUT_METHODS);

/** Référence de transaction saisie au paiement (momo/virement) — obligatoire. */
export const payoutReferenceSchema = z
  .string()
  .trim()
  .min(3, "Saisissez la référence de la transaction (3 caractères minimum).")
  .max(80, "Référence trop longue (80 caractères maximum).");

// ── Préparation d'un ordre (lecture référentiel, AVANT la transaction) ──

export type PayoutPlan = {
  missionId: string;
  talentId: string;
  workspaceId: string;
  amountGross: number;
  commissionRate: number;
  commissionAmount: number;
  amountNet: number;
  currency: string;
  /** Provenance du brut : montant déclaré par la marque ou tarif × jours. */
  basis: "declared" | "daily_rate";
  /** Jours facturés (assignedAt → deliveredAt) quand basis = daily_rate. */
  days: number | null;
  rateSource: string;
  ratePlaceholder: boolean;
};

export type PreparePayoutInput = {
  mission: {
    id: string;
    assigneeTalentId: string | null;
    assignedAt: Date | null;
    deliveredAt: Date | null;
  };
  /** Workspace PAYEUR — celui de la marque qui valide. */
  workspaceId: string;
  /** Montant brut saisi par la marque (null = dériver du tarif si possible). */
  declaredGross: number | null;
};

/**
 * Prépare l'ordre de gain d'une mission sur le point d'être validée. Null si
 * la mission n'a pas de talent Guilde (assignation directe au nom déclaré :
 * pas de compte à créditer, la validation passe sans ordre). Throw
 * `PayoutError` si l'ordre est dû mais incomputable — la validation est alors
 * refusée avec la marche à suivre, plutôt qu'un gain perdu ou inventé.
 */
export async function prepareMissionPayout(
  input: PreparePayoutInput,
): Promise<PayoutPlan | null> {
  const { mission, workspaceId, declaredGross } = input;
  if (!mission.assigneeTalentId) return null;

  const db = getDb();
  const talent = await db.talentProfile.findUnique({
    where: { id: mission.assigneeTalentId },
    select: {
      id: true,
      dailyRate: true,
      country: { select: { currency: true } },
    },
  });
  if (!talent) {
    throw new PayoutError(
      "TALENT_NOT_FOUND",
      "Profil talent introuvable — impossible de créer l'ordre de gain de cette mission.",
    );
  }
  const currency = talent.country.currency;

  const rate = await getGuildCommissionRate();
  if (!rate) {
    throw new PayoutError(
      "RATE_UNAVAILABLE",
      `Barème de commission Guilde introuvable (ZoneIndex famille « ${COMMISSION_FAMILY} », ` +
        `clé « ${GUILD_COMMISSION_KEY} ») — exécuter prisma/seed.mjs ou poser la ligne dans ` +
        "/admin/referentiels avant de valider : le gain du talent ne se calcule pas sans taux.",
    );
  }

  // Brut : montant déclaré d'abord, sinon tarif × jours — jamais inventé.
  let basis: PayoutPlan["basis"];
  let amountGross: number;
  const days = computeMissionDays(mission.assignedAt, mission.deliveredAt);
  if (declaredGross !== null) {
    basis = "declared";
    amountGross = declaredGross;
  } else {
    const estimated = estimateGrossFromDailyRate(talent.dailyRate, days);
    if (estimated === null) {
      throw new PayoutError(
        "AMOUNT_REQUIRED",
        "Le gain de cette mission n'est pas dérivable (tarif journalier non communiqué par le " +
          "talent, ou dates d'assignation/livraison manquantes) — saisissez le montant brut " +
          `convenu, en ${currency}, dans le formulaire de validation.`,
      );
    }
    basis = "daily_rate";
    amountGross = estimated;
  }

  const breakdown = computePayoutBreakdown(amountGross, rate.value);
  if (!breakdown) {
    throw new PayoutError(
      "INVALID_AMOUNT",
      `Montant brut inutilisable (${amountGross} ${currency}) — saisissez un montant entier ` +
        "positif raisonnable dans le formulaire de validation.",
    );
  }

  return {
    missionId: mission.id,
    talentId: talent.id,
    workspaceId,
    ...breakdown,
    currency,
    basis,
    days: basis === "daily_rate" ? days : days ?? null,
    rateSource: rate.source,
    ratePlaceholder: rate.placeholder,
  };
}

/**
 * Insère l'ordre de gain PENDING + AuditLog `payout.create` — à appeler DANS
 * la transaction du flip DELIVERED → VALIDATED (atomicité gain ⇄ validation).
 * Rail doctrinal : method « momo » à la création, confirmé/écrasé par
 * l'opérateur au paiement.
 */
export async function insertPayout(
  tx: Prisma.TransactionClient,
  plan: PayoutPlan,
  actorId: string,
): Promise<TalentPayout> {
  const payout = await tx.talentPayout.create({
    data: {
      missionId: plan.missionId,
      talentId: plan.talentId,
      workspaceId: plan.workspaceId,
      amountGross: plan.amountGross,
      commissionRate: plan.commissionRate,
      commissionAmount: plan.commissionAmount,
      amountNet: plan.amountNet,
      currency: plan.currency,
      status: "PENDING",
      method: "momo",
    },
  });
  await logAudit(
    {
      workspaceId: plan.workspaceId,
      actorId,
      action: "payout.create",
      entity: "TalentPayout",
      entityId: payout.id,
      payload: {
        missionId: plan.missionId,
        talentId: plan.talentId,
        basis: plan.basis,
        days: plan.days,
        amountGross: plan.amountGross,
        commissionRate: plan.commissionRate,
        commissionAmount: plan.commissionAmount,
        amountNet: plan.amountNet,
        currency: plan.currency,
        rateSource: plan.rateSource,
        ratePlaceholder: plan.ratePlaceholder,
      },
    },
    tx,
  );
  return payout;
}

// ── Contexte de la page mission (formulaire de validation + récap) ──────

export type MissionPayoutContext =
  | {
      /** Pas de talent Guilde sur la mission — aucun ordre à créer/afficher. */
      kind: "none";
    }
  | {
      /** Ordre déjà créé (mission validée) — récapitulatif affichable. */
      kind: "created";
      payout: {
        status: PayoutStatus;
        amountGross: number;
        commissionRate: number;
        commissionAmount: number;
        amountNet: number;
        currency: string;
        reference: string | null;
        createdAt: Date;
        paidAt: Date | null;
      };
    }
  | {
      /** Mission DELIVERED avec talent : données du formulaire de validation. */
      kind: "form";
      currency: string;
      dailyRate: number | null;
      days: number | null;
      /** dailyRate × jours si dérivable — sinon la saisie devient obligatoire. */
      estimatedGross: number | null;
      /** Taux en vigueur — null = référentiel non seedé (bloquant, dit tel quel). */
      rate: GuildCommissionRate | null;
    };

/**
 * Contexte gains d'une mission pour sa page cockpit — la tenancy de la
 * mission est déjà vérifiée par l'appelant (getMissionDetail).
 */
export async function getMissionPayoutContext(mission: {
  id: string;
  status: string;
  assigneeTalentId: string | null;
  assignedAt: Date | null;
  deliveredAt: Date | null;
}): Promise<MissionPayoutContext> {
  if (!mission.assigneeTalentId) return { kind: "none" };
  const db = getDb();

  const existing = await db.talentPayout.findUnique({
    where: { missionId: mission.id },
    select: {
      status: true,
      amountGross: true,
      commissionRate: true,
      commissionAmount: true,
      amountNet: true,
      currency: true,
      reference: true,
      createdAt: true,
      paidAt: true,
    },
  });
  if (existing) {
    return {
      kind: "created",
      payout: { ...existing, status: existing.status as PayoutStatus },
    };
  }
  if (mission.status !== "DELIVERED") return { kind: "none" };

  const talent = await db.talentProfile.findUnique({
    where: { id: mission.assigneeTalentId },
    select: { dailyRate: true, country: { select: { currency: true } } },
  });
  if (!talent) return { kind: "none" };

  const days = computeMissionDays(mission.assignedAt, mission.deliveredAt);
  return {
    kind: "form",
    currency: talent.country.currency,
    dailyRate: talent.dailyRate,
    days,
    estimatedGross: estimateGrossFromDailyRate(talent.dailyRate, days),
    rate: await getGuildCommissionRate(),
  };
}

// ── Côté talent : « Mes gains » (/studio) ───────────────────────────────

export type MyPayoutRow = {
  id: string;
  status: PayoutStatus;
  amountGross: number;
  commissionRate: number;
  commissionAmount: number;
  amountNet: number;
  currency: string;
  method: string;
  reference: string | null;
  createdAt: Date;
  paidAt: Date | null;
  /** Titre de la mission — le talent la connaît déjà (il l'a gagnée). */
  missionTitle: string;
};

/** Gains du talent, plus récents d'abord — uniquement ses propres ordres. */
export async function listMyPayouts(userId: string): Promise<MyPayoutRow[]> {
  const db = getDb();
  const rows = await db.talentPayout.findMany({
    where: { talent: { userId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      amountGross: true,
      commissionRate: true,
      commissionAmount: true,
      amountNet: true,
      currency: true,
      method: true,
      reference: true,
      createdAt: true,
      paidAt: true,
      mission: { select: { title: true } },
    },
  });
  return rows.map(({ mission, ...row }) => ({
    ...row,
    status: row.status as PayoutStatus,
    missionTitle: mission.title,
  }));
}

// ── Console opérateur : file PENDING → APPROVED → PAID (/admin/commissions) ──

export type AdminPayoutRow = {
  id: string;
  status: PayoutStatus;
  amountGross: number;
  commissionRate: number;
  commissionAmount: number;
  amountNet: number;
  currency: string;
  method: string;
  reference: string | null;
  createdAt: Date;
  approvedAt: Date | null;
  paidAt: Date | null;
  missionTitle: string;
  workspaceId: string;
  workspaceName: string;
  talent: {
    id: string;
    name: string;
    city: string;
    countryCode: string;
    /** Numéro momo/WhatsApp du talent — le rail de paiement de l'opérateur. */
    whatsapp: string | null;
  };
};

export type AdminPayouts = {
  /** À approuver (PENDING), plus anciens d'abord — une file se traite dans l'ordre. */
  pending: AdminPayoutRow[];
  /** À payer (APPROVED), plus anciens d'abord. */
  approved: AdminPayoutRow[];
  /** Dernières décisions terminales (PAID / REJECTED), plus récentes d'abord. */
  recent: AdminPayoutRow[];
  /** Totaux PAR DEVISE sur TOUS les ordres (compteurs + net dû + commissions). */
  summary: PayoutSummary;
};

type PayoutWithJoins = Prisma.TalentPayoutGetPayload<{
  include: {
    mission: { select: { title: true } };
    workspace: { select: { name: true } };
    talent: {
      select: {
        id: true;
        headline: true;
        city: true;
        countryCode: true;
        whatsapp: true;
        user: { select: { name: true } };
      };
    };
  };
}>;

function toAdminRow(row: PayoutWithJoins): AdminPayoutRow {
  return {
    id: row.id,
    status: row.status as PayoutStatus,
    amountGross: row.amountGross,
    commissionRate: row.commissionRate,
    commissionAmount: row.commissionAmount,
    amountNet: row.amountNet,
    currency: row.currency,
    method: row.method,
    reference: row.reference,
    createdAt: row.createdAt,
    approvedAt: row.approvedAt,
    paidAt: row.paidAt,
    missionTitle: row.mission.title,
    workspaceId: row.workspaceId,
    workspaceName: row.workspace.name,
    talent: {
      id: row.talent.id,
      name: row.talent.user.name?.trim() || row.talent.headline,
      city: row.talent.city,
      countryCode: row.talent.countryCode,
      whatsapp: row.talent.whatsapp,
    },
  };
}

const ADMIN_PAYOUT_INCLUDE = {
  mission: { select: { title: true } },
  workspace: { select: { name: true } },
  talent: {
    select: {
      id: true,
      headline: true,
      city: true,
      countryCode: true,
      whatsapp: true,
      user: { select: { name: true } },
    },
  },
} satisfies Prisma.TalentPayoutInclude;

/** Files + historique + totaux de la console commissions. */
export async function listAdminPayouts(recentTake = 20): Promise<AdminPayouts> {
  const db = getDb();
  const [pending, approved, recent, allForSummary] = await Promise.all([
    db.talentPayout.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: ADMIN_PAYOUT_INCLUDE,
    }),
    db.talentPayout.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "asc" },
      include: ADMIN_PAYOUT_INCLUDE,
    }),
    db.talentPayout.findMany({
      where: { status: { in: ["PAID", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
      take: recentTake,
      include: ADMIN_PAYOUT_INCLUDE,
    }),
    db.talentPayout.findMany({
      select: {
        status: true,
        currency: true,
        amountGross: true,
        commissionAmount: true,
        amountNet: true,
      },
    }),
  ]);
  return {
    pending: pending.map(toAdminRow),
    approved: approved.map(toAdminRow),
    recent: recent.map(toAdminRow),
    summary: summarizePayouts(
      allForSummary.map((row) => ({ ...row, status: row.status as PayoutStatus })),
    ),
  };
}

// ── Mutations opérateur (flips atomiques + audit, chaîne du payeur) ─────

type PayoutDecisionInput = { id: string; actorId: string };

async function requirePayout(id: string): Promise<TalentPayout> {
  const db = getDb();
  const payout = await db.talentPayout.findUnique({ where: { id } });
  if (!payout) {
    throw new PayoutError(
      "PAYOUT_NOT_FOUND",
      "Ordre de gain introuvable — la file a peut-être bougé, rechargez la page.",
    );
  }
  return payout;
}

/** Transition atomique d'un ordre : gate domaine + flip conditionnel + audit. */
async function transitionPayout(
  input: PayoutDecisionInput,
  to: PayoutStatus,
  auditAction: string,
  data: (now: Date) => Prisma.TalentPayoutUpdateManyMutationInput,
  auditPayload?: Prisma.InputJsonValue,
): Promise<TalentPayout> {
  const { id, actorId } = input;
  const payout = await requirePayout(id);

  const gate = canTransitionPayout(payout.status as PayoutStatus, to);
  if (!gate.ok) throw gateRefused(gate.reason);

  const db = getDb();
  return db.$transaction(async (tx) => {
    const flipped = await tx.talentPayout.updateMany({
      where: { id: payout.id, status: payout.status },
      data: { ...data(new Date()), status: to },
    });
    if (flipped.count === 0) {
      throw gateRefused("Cet ordre vient de changer d'état — rechargez la page.");
    }
    await logAudit(
      {
        workspaceId: payout.workspaceId,
        actorId,
        action: auditAction,
        entity: "TalentPayout",
        entityId: payout.id,
        payload: auditPayload ?? {
          missionId: payout.missionId,
          talentId: payout.talentId,
          amountNet: payout.amountNet,
          currency: payout.currency,
        },
      },
      tx,
    );
    return tx.talentPayout.findUniqueOrThrow({ where: { id: payout.id } });
  });
}

/** PENDING → APPROVED : l'opérateur approuve l'ordre (entre en file de paiement). */
export async function approvePayout(input: PayoutDecisionInput): Promise<TalentPayout> {
  return transitionPayout(input, "APPROVED", "payout.approve", (now) => ({ approvedAt: now }));
}

/** PENDING → REJECTED : décision terminale (l'ordre reste tracé, rien ne s'efface). */
export async function rejectPayout(input: PayoutDecisionInput): Promise<TalentPayout> {
  return transitionPayout(input, "REJECTED", "payout.reject", () => ({}));
}

export type PayPayoutInput = {
  id: string;
  /** Rail réellement utilisé — momo (Wave/OM/MTN/Moov) ou manuel. */
  method: PayoutMethod;
  /** Référence de la transaction saisie par l'opérateur — obligatoire. */
  reference: string;
  actorId: string;
};

/**
 * APPROVED → PAID : l'opérateur a réglé le NET au talent (momo) et saisit la
 * référence de transaction — le pendant sortant de la validation manuelle
 * des paiements entrants (/admin/paiements).
 */
export async function payPayout(input: PayPayoutInput): Promise<TalentPayout> {
  const { id, method, reference, actorId } = input;
  const payout = await requirePayout(id);

  const gate = canTransitionPayout(payout.status as PayoutStatus, "PAID");
  if (!gate.ok) throw gateRefused(gate.reason);

  const db = getDb();
  return db.$transaction(async (tx) => {
    const now = new Date();
    const flipped = await tx.talentPayout.updateMany({
      where: { id: payout.id, status: "APPROVED" },
      data: { status: "PAID", method, reference, paidAt: now },
    });
    if (flipped.count === 0) {
      throw gateRefused("Cet ordre vient de changer d'état — rechargez la page.");
    }
    await logAudit(
      {
        workspaceId: payout.workspaceId,
        actorId,
        action: "payout.pay",
        entity: "TalentPayout",
        entityId: payout.id,
        payload: {
          missionId: payout.missionId,
          talentId: payout.talentId,
          amountNet: payout.amountNet,
          currency: payout.currency,
          method,
          reference,
        },
      },
      tx,
    );
    return tx.talentPayout.findUniqueOrThrow({ where: { id: payout.id } });
  });
}
