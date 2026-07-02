import type { Subscription } from "@prisma/client";
import { getDb } from "@/lib/db";
import type { SessionPayload } from "@/lib/session-token";
import type { BrandLevel } from "@/domain/pillars";
import { subscriptionIsActiveAt } from "./finance";

/**
 * Agency — vue flotte de l'espace agence (/agence). LECTURE SEULE : aucune
 * mutation ici, donc pas d'AuditLog (la doctrine ne trace que les mutations).
 *
 * Définition v7 de « la flotte » — uniquement ce que les tables existantes
 * savent dire, sans inventer de lien Agence→Marque qui n'existe pas en
 * schéma : les workspaces BRAND où AU MOINS UN membre du workspace AGENCY
 * détient une Membership. Pas de table de rattachement dédiée en tranche 1 ;
 * le rattachement EST la membership (inviter un membre de l'agence dans le
 * workspace d'une marque la fait entrer dans la flotte).
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

/**
 * La flotte de l'agence du user courant, ou null s'il n'a aucune membership
 * dans un workspace AGENCY (la page affiche alors un refus honnête, pas une
 * flotte vide). Si le user appartient à plusieurs agences, celle de la
 * session fait foi, sinon la première créée (même règle que getUserWorkspace).
 */
export async function getAgencyFleet(
  session: Pick<SessionPayload, "userId" | "workspaceId">,
): Promise<AgencyFleet | null> {
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

  const agency = membership.workspace;

  // L'équipe : tous les membres du workspace agence, quel que soit leur rôle.
  const team = await db.membership.findMany({
    where: { workspaceId: agency.id },
    select: { userId: true },
  });
  const teamUserIds = [...new Set(team.map((m) => m.userId))];

  // La flotte : les workspaces BRAND où un membre de l'équipe a une membership.
  const workspaces = await db.workspace.findMany({
    where: {
      kind: "BRAND",
      memberships: { some: { userId: { in: teamUserIds } } },
    },
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
  }));

  const allBrands = rows.flatMap((ws) => ws.brands);
  return {
    agency: { id: agency.id, slug: agency.slug, name: agency.name, role: membership.role },
    teamSize: teamUserIds.length,
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
