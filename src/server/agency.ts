import type { ApplicationStatus, CampaignAction, Prisma, Subscription } from "@prisma/client";
import { getDb } from "@/lib/db";
import type { SessionPayload } from "@/lib/session-token";
import type { BrandLevel } from "@/domain/pillars";
import {
  MISSION_STATUSES,
  type CampaignStatus,
  type MissionStatus,
} from "@/domain/campaign";
import { summarizePayouts, type PayoutStatus, type PayoutSummary } from "@/domain/payout";
import { costSummary } from "./campaigns";
import {
  PLAN_PERIOD_DAYS,
  planSchema,
  shortReference,
  subscriptionIsActiveAt,
} from "./finance";
import type { PlanKey } from "./market";

/**
 * Agency — vue flotte de l'espace agence (/espace-agence). LECTURE SEULE :
 * aucune mutation ici, donc pas d'AuditLog (la doctrine ne trace que les
 * mutations).
 *
 * Définition v7 de « la flotte » — uniquement ce que les tables existantes
 * savent dire, sans inventer de lien Agence→Marque qui n'existe pas en
 * schéma : les workspaces BRAND où AU MOINS UN membre du workspace AGENCY
 * détient une Membership. Pas de table de rattachement dédiée en tranche 1 ;
 * le rattachement EST la membership (inviter un membre de l'agence dans le
 * workspace d'une marque la fait entrer dans la flotte).
 *
 * WP-018 étend cet espace en profondeur (port de l'esprit `(agency)/*`
 * legacy — clients, missions, revenue, campaigns) sur les tables v7 réelles :
 * chaque lecture passe par le MÊME périmètre flotte (memberships d'équipe),
 * jamais par un scan global.
 */

// ── Statut d'abonnement d'un workspace de la flotte (pur, testable) ─────

export type FleetSubscriptionStatus = "active" | "pending" | "expired" | "none";

export type FleetSubscriptionSnapshot = {
  status: FleetSubscriptionStatus;
  /** Échéance affichable — renseignée pour `active` (fin d'accès) et `expired` (dernière échéance). */
  expiresAt: Date | null;
};

/**
 * Réduit l'historique de souscriptions d'un workspace à UN statut lisible,
 * par précédence : active > pending (demande en validation opérateur) >
 * expired (une période validée est échue) > none. Réutilise la règle canon
 * `subscriptionIsActiveAt` de finance.ts — jamais de re-dérivation locale.
 */
export function fleetSubscriptionSnapshot(
  subs: ReadonlyArray<Pick<Subscription, "status" | "expiresAt">>,
  at: Date,
): FleetSubscriptionSnapshot {
  const actives = subs.filter((sub) => subscriptionIsActiveAt(sub, at));
  if (actives.length > 0) {
    // Plusieurs actives (théorique) : l'échéance la plus lointaine fait foi.
    const expiresAt = actives.reduce<Date | null>(
      (max, sub) =>
        sub.expiresAt !== null && (max === null || sub.expiresAt.getTime() > max.getTime())
          ? sub.expiresAt
          : max,
      null,
    );
    return { status: "active", expiresAt };
  }

  if (subs.some((sub) => sub.status === "pending_manual")) {
    return { status: "pending", expiresAt: null };
  }

  // Même règle que finance.getSubscriptionState : une période validée échue.
  const lapsed = subs.filter(
    (sub) =>
      (sub.status === "active" || sub.status === "expired") &&
      sub.expiresAt !== null &&
      sub.expiresAt.getTime() <= at.getTime(),
  );
  if (lapsed.length > 0) {
    const expiresAt = lapsed.reduce<Date | null>(
      (max, sub) =>
        sub.expiresAt !== null && (max === null || sub.expiresAt.getTime() > max.getTime())
          ? sub.expiresAt
          : max,
      null,
    );
    return { status: "expired", expiresAt };
  }

  return { status: "none", expiresAt: null };
}

/** Moyenne arrondie des scores connus — null si aucune marque n'a de score. */
export function averageRoundedScore(
  totals: ReadonlyArray<number | null | undefined>,
): number | null {
  const known = totals.filter((t): t is number => typeof t === "number" && Number.isFinite(t));
  if (known.length === 0) return null;
  return Math.round(known.reduce((sum, t) => sum + t, 0) / known.length);
}

// ── Lecture de la flotte ────────────────────────────────────────────────

export type FleetBrand = {
  id: string;
  name: string;
  sector: string | null;
  level: BrandLevel;
  /** Dernier BrandScore persisté (/200) — null si jamais calculé. */
  score: number | null;
  scoreComputedAt: Date | null;
};

export type FleetWorkspace = {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
  memberCount: number;
  brands: FleetBrand[];
  subscription: FleetSubscriptionSnapshot;
  /** Dernière ligne AuditLog du workspace — null si aucune mutation tracée. */
  lastActivityAt: Date | null;
};

export type AgencyFleet = {
  agency: { id: string; slug: string; name: string; role: SessionPayload["role"] };
  /** Nombre de membres du workspace agence (l'équipe). */
  teamSize: number;
  workspaces: FleetWorkspace[];
  totals: {
    workspaces: number;
    brands: number;
    /** Moyenne des derniers scores connus (/200) — null si aucun score en base. */
    averageScore: number | null;
    activeSubscriptions: number;
    pendingSubscriptions: number;
  };
};

export type AgencyRef = AgencyFleet["agency"];

type AgencyContext = { agency: AgencyRef; teamUserIds: string[] };

/**
 * Contexte agence du user courant : le workspace AGENCY qui fait foi (celui
 * de la session, sinon le premier par id — même règle que getUserWorkspace)
 * + les ids de TOUTE l'équipe. null = aucune membership agence (les pages
 * affichent un refus honnête). C'est LE socle tenancy de toutes les lectures
 * de cet espace : rien ne se lit hors des workspaces atteignables par
 * l'équipe.
 */
async function getAgencyContext(
  session: Pick<SessionPayload, "userId" | "workspaceId">,
): Promise<AgencyContext | null> {
  const db = getDb();

  const agencyMemberships = await db.membership.findMany({
    where: { userId: session.userId, workspace: { kind: "AGENCY" } },
    orderBy: { id: "asc" },
    select: {
      role: true,
      workspace: { select: { id: true, slug: true, name: true } },
    },
  });
  const membership =
    agencyMemberships.find((m) => m.workspace.id === session.workspaceId) ??
    agencyMemberships[0];
  if (!membership) return null;

  // L'équipe : tous les membres du workspace agence, quel que soit leur rôle.
  const team = await db.membership.findMany({
    where: { workspaceId: membership.workspace.id },
    select: { userId: true },
  });

  return {
    agency: { ...membership.workspace, role: membership.role },
    teamUserIds: [...new Set(team.map((m) => m.userId))],
  };
}

/** Périmètre flotte : workspaces BRAND où un membre de l'équipe a une membership. */
function fleetWorkspaceWhere(teamUserIds: string[]): Prisma.WorkspaceWhereInput {
  return {
    kind: "BRAND",
    memberships: { some: { userId: { in: teamUserIds } } },
  };
}

/**
 * La flotte de l'agence du user courant, ou null s'il n'a aucune membership
 * dans un workspace AGENCY (la page affiche alors un refus honnête, pas une
 * flotte vide). Si le user appartient à plusieurs agences, celle de la
 * session fait foi, sinon la première créée (même règle que getUserWorkspace).
 */
export async function getAgencyFleet(
  session: Pick<SessionPayload, "userId" | "workspaceId">,
): Promise<AgencyFleet | null> {
  const context = await getAgencyContext(session);
  if (!context) return null;
  const db = getDb();

  const workspaces = await db.workspace.findMany({
    where: fleetWorkspaceWhere(context.teamUserIds),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      createdAt: true,
      _count: { select: { memberships: true } },
      brands: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          sector: true,
          level: true,
          scores: {
            orderBy: { computedAt: "desc" },
            take: 1,
            select: { total: true, computedAt: true },
          },
        },
      },
      subscriptions: { select: { status: true, expiresAt: true } },
    },
  });

  // Dernière activité réelle par workspace : la dernière ligne AuditLog —
  // aucune activité tracée = null affiché tel quel, jamais une date inventée.
  const workspaceIds = workspaces.map((ws) => ws.id);
  const lastActivity =
    workspaceIds.length === 0
      ? []
      : await db.auditLog.groupBy({
          by: ["workspaceId"],
          where: { workspaceId: { in: workspaceIds } },
          _max: { createdAt: true },
        });
  const lastActivityByWorkspace = new Map(
    lastActivity.map((row) => [row.workspaceId, row._max.createdAt]),
  );

  const now = new Date();
  const rows: FleetWorkspace[] = workspaces.map((ws) => ({
    id: ws.id,
    slug: ws.slug,
    name: ws.name,
    createdAt: ws.createdAt,
    memberCount: ws._count.memberships,
    brands: ws.brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      sector: brand.sector,
      level: brand.level,
      score: brand.scores[0]?.total ?? null,
      scoreComputedAt: brand.scores[0]?.computedAt ?? null,
    })),
    subscription: fleetSubscriptionSnapshot(ws.subscriptions, now),
    lastActivityAt: lastActivityByWorkspace.get(ws.id) ?? null,
  }));

  const allBrands = rows.flatMap((ws) => ws.brands);
  return {
    agency: context.agency,
    teamSize: context.teamUserIds.length,
    workspaces: rows,
    totals: {
      workspaces: rows.length,
      brands: allBrands.length,
      averageScore: averageRoundedScore(allBrands.map((b) => b.score)),
      activeSubscriptions: rows.filter((ws) => ws.subscription.status === "active").length,
      pendingSubscriptions: rows.filter((ws) => ws.subscription.status === "pending").length,
    },
  };
}

// ═══ WP-018 — profondeur espace agence (PURES d'abord, loaders ensuite) ═══

/** Candidatures guilde encore SANS décision (APPLIED/SHORTLISTED — WP-011). */
const PENDING_APPLICATION_STATUSES: ApplicationStatus[] = ["APPLIED", "SHORTLISTED"];

// ── Agrégations PURES (testables sans DB) ───────────────────────────────

/** Clé de mois UTC « YYYY-MM » — l'agrégation mensuelle ne dépend pas du fuseau du serveur. */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type ConfirmedPaymentLike = {
  workspaceId: string;
  /** Unité mineure de `currency` (contrat de la table Payment). */
  amount: number;
  currency: string;
  createdAt: Date;
};

export type MonthlyRevenueRow = {
  /** « YYYY-MM » (UTC). */
  month: string;
  count: number;
  /** Totaux PAR DEVISE — deux devises ne s'additionnent jamais entre elles. */
  totals: Record<string, number>;
  byWorkspace: Array<{
    workspaceId: string;
    count: number;
    totals: Record<string, number>;
  }>;
};

/**
 * Paiements confirmés → lignes mensuelles (mois les plus récents d'abord),
 * ventilées par workspace. Somme UNIQUEMENT par devise (XOF et XAF sont à
 * parité mais restent des devises distinctes — on ne mélange pas). Vide → [].
 */
export function aggregatePaymentsByMonth(
  payments: ReadonlyArray<ConfirmedPaymentLike>,
): MonthlyRevenueRow[] {
  type Bucket = {
    count: number;
    totals: Record<string, number>;
    byWorkspace: Map<string, { count: number; totals: Record<string, number> }>;
  };
  const byMonth = new Map<string, Bucket>();

  for (const payment of payments) {
    const key = monthKey(payment.createdAt);
    let bucket = byMonth.get(key);
    if (!bucket) {
      bucket = { count: 0, totals: {}, byWorkspace: new Map() };
      byMonth.set(key, bucket);
    }
    bucket.count += 1;
    bucket.totals[payment.currency] = (bucket.totals[payment.currency] ?? 0) + payment.amount;

    let ws = bucket.byWorkspace.get(payment.workspaceId);
    if (!ws) {
      ws = { count: 0, totals: {} };
      bucket.byWorkspace.set(payment.workspaceId, ws);
    }
    ws.count += 1;
    ws.totals[payment.currency] = (ws.totals[payment.currency] ?? 0) + payment.amount;
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1)) // « YYYY-MM » trie lexicalement — desc
    .map(([month, bucket]) => ({
      month,
      count: bucket.count,
      totals: bucket.totals,
      byWorkspace: [...bucket.byWorkspace.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1)) // ordre stable par id
        .map(([workspaceId, ws]) => ({ workspaceId, ...ws })),
    }));
}

/** Équivalent 30 jours d'un montant couvrant `periodDays` jours (arrondi entier — unités mineures). */
export function monthlyAmountOver30Days(amount: number, periodDays: number): number {
  return Math.round((amount * 30) / periodDays);
}

export type MrrSubscriptionInput = {
  workspaceId: string;
  workspaceName: string;
  /** `Subscription.plan` brut (String en DB — re-vérifié contre le catalogue). */
  plan: string;
  /** Paiement confirmé qui a activé la souscription — null si introuvable. */
  payment: { amount: number; currency: string } | null;
};

export type MrrContribution = {
  workspaceId: string;
  workspaceName: string;
  plan: PlanKey;
  /** Montant réellement payé (unité mineure). */
  amount: number;
  currency: string;
  /** Normalisation 30 j : amount × 30 / période du plan (30 j cockpit, 92 j retainer). */
  monthly: number;
};

export type MrrSummary = {
  /** MRR par devise — vide si aucune contribution résoluble. */
  byCurrency: Record<string, number>;
  contributions: MrrContribution[];
  /** Abonnements actifs dont le montant réel n'est PAS dérivable — affichés, jamais estimés. */
  unresolved: Array<{
    workspaceId: string;
    workspaceName: string;
    plan: string;
    reason: string;
  }>;
};

/**
 * MRR « simple et honnête » : Σ des paiements confirmés des abonnements
 * ACTIFS, chacun normalisé sur 30 jours par la période réelle de son plan
 * (PLAN_PERIOD_DAYS — 30 j cockpit, 92 j retainer). Arithmétique sur des
 * montants réellement encaissés, AUCUNE projection : plan hors catalogue ou
 * paiement introuvable → ligne `unresolved` avec sa raison, jamais un chiffre
 * inventé. Vide → tout vide.
 */
export function computeSimpleMrr(rows: ReadonlyArray<MrrSubscriptionInput>): MrrSummary {
  const byCurrency: Record<string, number> = {};
  const contributions: MrrContribution[] = [];
  const unresolved: MrrSummary["unresolved"] = [];

  for (const row of rows) {
    const parsed = planSchema.safeParse(row.plan);
    if (!parsed.success) {
      unresolved.push({
        workspaceId: row.workspaceId,
        workspaceName: row.workspaceName,
        plan: row.plan,
        reason: `Plan « ${row.plan} » hors catalogue — période inconnue, normalisation impossible.`,
      });
      continue;
    }
    if (!row.payment) {
      unresolved.push({
        workspaceId: row.workspaceId,
        workspaceName: row.workspaceName,
        plan: row.plan,
        reason: "Paiement confirmé introuvable pour cette souscription — montant réel non dérivable.",
      });
      continue;
    }
    const monthly = monthlyAmountOver30Days(row.payment.amount, PLAN_PERIOD_DAYS[parsed.data]);
    contributions.push({
      workspaceId: row.workspaceId,
      workspaceName: row.workspaceName,
      plan: parsed.data,
      amount: row.payment.amount,
      currency: row.payment.currency,
      monthly,
    });
    byCurrency[row.payment.currency] = (byCurrency[row.payment.currency] ?? 0) + monthly;
  }

  return { byCurrency, contributions, unresolved };
}

export type CostActionLike = Pick<CampaignAction, "status" | "estimatedCost" | "costCurrency">;

/**
 * Total estimé d'un lot d'actions, PAR DEVISE + compteur « à estimer »
 * (actions non annulées sans coût résolu — dont un coût sans devise,
 * inutilisable). Complète costSummary (mono-campagne) pour la vue flotte
 * multi-marchés. Vide → { byCurrency: {}, unestimated: 0 }.
 */
export function totalEstimatedByCurrency(actions: ReadonlyArray<CostActionLike>): {
  byCurrency: Record<string, number>;
  unestimated: number;
} {
  const byCurrency: Record<string, number> = {};
  let unestimated = 0;
  for (const action of actions) {
    if (action.status === "CANCELLED") continue;
    if (action.estimatedCost === null || action.costCurrency === null) {
      unestimated += 1;
      continue;
    }
    byCurrency[action.costCurrency] = (byCurrency[action.costCurrency] ?? 0) + action.estimatedCost;
  }
  return { byCurrency, unestimated };
}

/**
 * Groupe des lignes par étape du circuit mission, dans l'ordre canon
 * OPEN → ASSIGNED → DELIVERED → VALIDATED (toutes les étapes présentes,
 * éventuellement vides — l'UI décide d'afficher ou non les vides). L'ordre
 * d'entrée est préservé dans chaque groupe.
 */
export function groupByMissionStatus<T extends { status: string }>(
  rows: ReadonlyArray<T>,
): Array<{ status: MissionStatus; rows: T[] }> {
  const buckets = new Map<MissionStatus, T[]>(MISSION_STATUSES.map((status) => [status, []]));
  for (const row of rows) {
    buckets.get(row.status as MissionStatus)?.push(row);
  }
  return MISSION_STATUSES.map((status) => ({ status, rows: buckets.get(status) ?? [] }));
}

// ── /espace-agence/clients/[workspaceId] — fiche client ─────────────────

export type FleetClientCampaign = {
  id: string;
  name: string;
  objective: string;
  status: CampaignStatus;
  countryName: string;
  countryCode: string;
  brandName: string;
  createdAt: Date;
  actionCount: number;
  costs: { total: number; currency: string | null; unestimated: number };
};

export type FleetClientMission = {
  id: string;
  title: string;
  status: MissionStatus;
  assignee: string | null;
  createdAt: Date;
  campaignName: string;
  actionName: string;
};

export type FleetClientPayment = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  createdAt: Date;
};

export type FleetClientDetail = {
  agency: AgencyRef;
  workspace: { id: string; slug: string; name: string; createdAt: Date; memberCount: number };
  brands: FleetBrand[];
  subscription: FleetSubscriptionSnapshot;
  lastActivityAt: Date | null;
  campaigns: FleetClientCampaign[];
  /** Missions non encore validées (OPEN / ASSIGNED / DELIVERED), plus récentes d'abord. */
  missionsInProgress: FleetClientMission[];
  /** Derniers paiements du workspace, tous statuts (le statut est affiché). */
  recentPayments: FleetClientPayment[];
};

export type FleetClientLookup =
  | { kind: "no-agency" }
  | { kind: "not-found"; agency: AgencyRef }
  | { kind: "ok"; detail: FleetClientDetail };

/**
 * Fiche d'un workspace client de la flotte. Tenancy : le workspace doit être
 * DANS la flotte (kind BRAND + membership d'un membre de l'équipe) — un id
 * forgé ou hors flotte est introuvable, même s'il existe en base.
 */
export async function getFleetClientDetail(
  session: Pick<SessionPayload, "userId" | "workspaceId">,
  workspaceId: string,
): Promise<FleetClientLookup> {
  const context = await getAgencyContext(session);
  if (!context) return { kind: "no-agency" };
  const db = getDb();

  const workspace = await db.workspace.findFirst({
    where: { id: workspaceId, ...fleetWorkspaceWhere(context.teamUserIds) },
    select: {
      id: true,
      slug: true,
      name: true,
      createdAt: true,
      _count: { select: { memberships: true } },
      brands: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          sector: true,
          level: true,
          scores: {
            orderBy: { computedAt: "desc" },
            take: 1,
            select: { total: true, computedAt: true },
          },
        },
      },
      subscriptions: { select: { status: true, expiresAt: true } },
    },
  });
  if (!workspace) return { kind: "not-found", agency: context.agency };

  const [campaigns, missions, payments, lastAudit] = await Promise.all([
    db.campaign.findMany({
      where: { brand: { workspaceId: workspace.id } },
      orderBy: { createdAt: "desc" },
      include: {
        country: { select: { name: true } },
        brand: { select: { name: true } },
        actions: { select: { status: true, estimatedCost: true, costCurrency: true } },
      },
    }),
    db.mission.findMany({
      where: {
        status: { in: ["OPEN", "ASSIGNED", "DELIVERED"] },
        brief: { action: { campaign: { brand: { workspaceId: workspace.id } } } },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        assignee: true,
        createdAt: true,
        brief: {
          select: {
            action: { select: { name: true, campaign: { select: { name: true } } } },
          },
        },
      },
    }),
    db.payment.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        reference: true,
        createdAt: true,
      },
    }),
    db.auditLog.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return {
    kind: "ok",
    detail: {
      agency: context.agency,
      workspace: {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        createdAt: workspace.createdAt,
        memberCount: workspace._count.memberships,
      },
      brands: workspace.brands.map((brand) => ({
        id: brand.id,
        name: brand.name,
        sector: brand.sector,
        level: brand.level,
        score: brand.scores[0]?.total ?? null,
        scoreComputedAt: brand.scores[0]?.computedAt ?? null,
      })),
      subscription: fleetSubscriptionSnapshot(workspace.subscriptions, new Date()),
      lastActivityAt: lastAudit?.createdAt ?? null,
      campaigns: campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status as CampaignStatus,
        countryName: campaign.country.name,
        countryCode: campaign.countryCode,
        brandName: campaign.brand.name,
        createdAt: campaign.createdAt,
        actionCount: campaign.actions.filter((a) => a.status !== "CANCELLED").length,
        costs: costSummary(campaign.actions),
      })),
      missionsInProgress: missions.map((mission) => ({
        id: mission.id,
        title: mission.title,
        status: mission.status as MissionStatus,
        assignee: mission.assignee,
        createdAt: mission.createdAt,
        campaignName: mission.brief.action.campaign.name,
        actionName: mission.brief.action.name,
      })),
      recentPayments: payments,
    },
  };
}

// ── /espace-agence/missions — missions de la flotte ─────────────────────

export type FleetMissionRow = {
  id: string;
  title: string;
  status: MissionStatus;
  assignee: string | null;
  createdAt: Date;
  campaignName: string;
  actionName: string;
  brandName: string;
  workspaceId: string;
  workspaceName: string;
  /** Publiée sur le mur de la guilde (gate opérateur, WP-011). */
  openToGuild: boolean;
  /** Candidatures guilde en attente de décision (APPLIED/SHORTLISTED) — comptées, jamais estimées. */
  pendingApplications: number;
};

export type FleetMissions = { agency: AgencyRef; missions: FleetMissionRow[] };

/** Toutes les missions des marques de la flotte, plus récentes d'abord. */
export async function listFleetMissions(
  session: Pick<SessionPayload, "userId" | "workspaceId">,
): Promise<FleetMissions | null> {
  const context = await getAgencyContext(session);
  if (!context) return null;
  const db = getDb();

  const missions = await db.mission.findMany({
    where: {
      brief: {
        action: {
          campaign: { brand: { workspace: fleetWorkspaceWhere(context.teamUserIds) } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      assignee: true,
      createdAt: true,
      openToGuild: true,
      _count: {
        select: {
          applications: { where: { status: { in: PENDING_APPLICATION_STATUSES } } },
        },
      },
      brief: {
        select: {
          action: {
            select: {
              name: true,
              campaign: {
                select: {
                  name: true,
                  brand: {
                    select: {
                      name: true,
                      workspace: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return {
    agency: context.agency,
    missions: missions.map((mission) => ({
      id: mission.id,
      title: mission.title,
      status: mission.status as MissionStatus,
      assignee: mission.assignee,
      createdAt: mission.createdAt,
      campaignName: mission.brief.action.campaign.name,
      actionName: mission.brief.action.name,
      brandName: mission.brief.action.campaign.brand.name,
      workspaceId: mission.brief.action.campaign.brand.workspace.id,
      workspaceName: mission.brief.action.campaign.brand.workspace.name,
      openToGuild: mission.openToGuild,
      pendingApplications: mission._count.applications,
    })),
  };
}

// ── /espace-agence/campagnes — campagnes de la flotte ───────────────────

export type FleetCampaignRow = {
  id: string;
  name: string;
  objective: string;
  status: CampaignStatus;
  createdAt: Date;
  countryName: string;
  countryCode: string;
  brandName: string;
  workspaceId: string;
  workspaceName: string;
  actions: CostActionLike[];
};

export type FleetCampaigns = { agency: AgencyRef; campaigns: FleetCampaignRow[] };

/** Toutes les campagnes des marques de la flotte, plus récentes d'abord. */
export async function listFleetCampaigns(
  session: Pick<SessionPayload, "userId" | "workspaceId">,
): Promise<FleetCampaigns | null> {
  const context = await getAgencyContext(session);
  if (!context) return null;
  const db = getDb();

  const campaigns = await db.campaign.findMany({
    where: { brand: { workspace: fleetWorkspaceWhere(context.teamUserIds) } },
    orderBy: { createdAt: "desc" },
    include: {
      country: { select: { name: true } },
      brand: { select: { name: true, workspace: { select: { id: true, name: true } } } },
      actions: { select: { status: true, estimatedCost: true, costCurrency: true } },
    },
  });

  return {
    agency: context.agency,
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status as CampaignStatus,
      createdAt: campaign.createdAt,
      countryName: campaign.country.name,
      countryCode: campaign.countryCode,
      brandName: campaign.brand.name,
      workspaceId: campaign.brand.workspace.id,
      workspaceName: campaign.brand.workspace.name,
      actions: campaign.actions,
    })),
  };
}

// ── /espace-agence/revenus — paiements réels + MRR simple ───────────────

export type FleetRevenue = {
  agency: AgencyRef;
  /** id → nom des workspaces de la flotte (affichage des ventilations). */
  workspaceNames: Record<string, string>;
  /** Paiements CONFIRMÉS agrégés par mois (desc) puis par workspace. */
  months: MonthlyRevenueRow[];
  confirmedPaymentCount: number;
  /** MRR simple dérivé des abonnements actifs (paiements réels normalisés 30 j). */
  mrr: MrrSummary;
  activeSubscriptions: number;
  /** Commissions talents générées par les missions Guilde de la flotte (WP-024) —
   * agrégat pur `summarizePayouts` sur les ordres `TalentPayout` réels. */
  commissions: PayoutSummary;
};

/**
 * Vue revenus de la flotte — UNIQUEMENT des lignes réelles : paiements
 * `confirmed` de la table Payment, abonnements actifs de la table
 * Subscription (le paiement d'activation est retrouvé par sa référence
 * courte `LF-…`, posée par finance.approveSubscription). Rien de projeté.
 */
export async function getFleetRevenue(
  session: Pick<SessionPayload, "userId" | "workspaceId">,
): Promise<FleetRevenue | null> {
  const context = await getAgencyContext(session);
  if (!context) return null;
  const db = getDb();

  const workspaces = await db.workspace.findMany({
    where: fleetWorkspaceWhere(context.teamUserIds),
    select: { id: true, name: true },
  });
  const workspaceIds = workspaces.map((ws) => ws.id);
  const workspaceNames = Object.fromEntries(workspaces.map((ws) => [ws.id, ws.name]));

  if (workspaceIds.length === 0) {
    return {
      agency: context.agency,
      workspaceNames,
      months: [],
      confirmedPaymentCount: 0,
      mrr: { byCurrency: {}, contributions: [], unresolved: [] },
      activeSubscriptions: 0,
      commissions: summarizePayouts([]),
    };
  }

  const [payments, subscriptions, payoutRows] = await Promise.all([
    db.payment.findMany({
      where: { workspaceId: { in: workspaceIds }, status: "confirmed" },
      orderBy: { createdAt: "desc" },
      select: {
        workspaceId: true,
        amount: true,
        currency: true,
        createdAt: true,
        reference: true,
      },
    }),
    db.subscription.findMany({
      where: { workspaceId: { in: workspaceIds } },
      select: { id: true, workspaceId: true, plan: true, status: true, expiresAt: true },
    }),
    db.talentPayout.findMany({
      where: { workspaceId: { in: workspaceIds } },
      select: {
        status: true,
        currency: true,
        amountGross: true,
        commissionAmount: true,
        amountNet: true,
      },
    }),
  ]);

  // Paiement d'activation par (workspace, référence) — l'ordre desc garantit
  // que la première occurrence est la plus récente.
  const paymentByReference = new Map<string, { amount: number; currency: string }>();
  for (const payment of payments) {
    if (!payment.reference) continue;
    const key = `${payment.workspaceId}:${payment.reference}`;
    if (!paymentByReference.has(key)) {
      paymentByReference.set(key, { amount: payment.amount, currency: payment.currency });
    }
  }

  const now = new Date();
  const actives = subscriptions.filter((sub) => subscriptionIsActiveAt(sub, now));
  const mrr = computeSimpleMrr(
    actives.map((sub) => ({
      workspaceId: sub.workspaceId,
      workspaceName: workspaceNames[sub.workspaceId] ?? sub.workspaceId,
      plan: sub.plan,
      payment:
        paymentByReference.get(`${sub.workspaceId}:${shortReference(sub.id)}`) ?? null,
    })),
  );

  return {
    agency: context.agency,
    workspaceNames,
    months: aggregatePaymentsByMonth(payments),
    confirmedPaymentCount: payments.length,
    mrr,
    activeSubscriptions: actives.length,
    commissions: summarizePayouts(
      payoutRows.map((row) => ({ ...row, status: row.status as PayoutStatus })),
    ),
  };
}

// ── /espace-agence — compteurs de production (cartes vers les onglets) ──

export type FleetPulse = {
  agency: AgencyRef;
  campaigns: { total: number; active: number };
  /** inProgress = OPEN/ASSIGNED/DELIVERED (pas encore validées). */
  missions: { total: number; inProgress: number };
  /** Candidatures guilde en attente de décision sur les missions de la flotte. */
  pendingApplications: number;
  /** Paiements `confirmed` encaissés sur les workspaces de la flotte. */
  confirmedPayments: number;
};

/**
 * Compteurs vivants du dashboard agence — six `count` Prisma sur le MÊME
 * périmètre flotte que le reste de l'espace, zéro agrégat inventé. Alimente
 * les cartes qui mènent aux onglets campagnes / missions / revenus.
 */
export async function getFleetPulse(
  session: Pick<SessionPayload, "userId" | "workspaceId">,
): Promise<FleetPulse | null> {
  const context = await getAgencyContext(session);
  if (!context) return null;
  const db = getDb();

  const fleetWhere = fleetWorkspaceWhere(context.teamUserIds);
  const campaignWhere: Prisma.CampaignWhereInput = { brand: { workspace: fleetWhere } };
  const missionWhere: Prisma.MissionWhereInput = {
    brief: { action: { campaign: campaignWhere } },
  };

  const [
    campaignTotal,
    campaignActive,
    missionTotal,
    missionInProgress,
    pendingApplications,
    confirmedPayments,
  ] = await Promise.all([
    db.campaign.count({ where: campaignWhere }),
    db.campaign.count({ where: { ...campaignWhere, status: "ACTIVE" } }),
    db.mission.count({ where: missionWhere }),
    db.mission.count({
      where: { ...missionWhere, status: { in: ["OPEN", "ASSIGNED", "DELIVERED"] } },
    }),
    db.missionApplication.count({
      where: { mission: missionWhere, status: { in: PENDING_APPLICATION_STATUSES } },
    }),
    db.payment.count({ where: { workspace: fleetWhere, status: "confirmed" } }),
  ]);

  return {
    agency: context.agency,
    campaigns: { total: campaignTotal, active: campaignActive },
    missions: { total: missionTotal, inProgress: missionInProgress },
    pendingApplications,
    confirmedPayments,
  };
}
