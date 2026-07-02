import type { Prisma, Subscription, ZoneIndex } from "@prisma/client";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { logAudit } from "./audit";
import { computeSelfHash } from "./audit-hash";
import { PLAN_LABELS } from "./market";
import { planSchema, shortReference, subscriptionIsActiveAt } from "./finance";

/**
 * Admin — profondeur console opérateur (WP-015, vague 1). Port de l'ESPRIT des
 * panneaux console legacy qui mappent sur les tables v7 existantes :
 *   - governance/accounts  → utilisateurs + rôles (lecture, recherche)
 *   - ecosystem/operators  → workspaces (flotte des espaces)
 *   - socle/manual-subscriptions + socle/revenue → abonnements cross-workspace
 *   - socle/pricing + socle/market-costs + governance/markets → référentiels
 *     Country/ZoneIndex ÉDITABLES (le remplacement du « barème seedé » :
 *     l'opérateur édite en base, source obligatoire, tout est audité)
 *   - governance/intents   → journal d'audit + vérification de chaîne
 *
 * Doctrine : lectures paginées simples (take/skip), mutations = service +
 * transaction + AuditLog hash-chaîné, jamais de donnée inventée.
 */

// ── Pagination (take/skip simple, bornée) ───────────────────────────────

export const PAGE_SIZE = 50;

/** Numéro de page ≥ 1 depuis un searchParam brut (défaut 1, jamais NaN). */
export function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

// ── Utilisateurs (esprit governance/accounts) ───────────────────────────

export type UserListRow = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  memberships: Array<{
    role: string;
    workspaceId: string;
    workspaceName: string;
    workspaceKind: string;
  }>;
};

export type UserListResult = { rows: UserListRow[]; total: number };

/** Liste paginée des comptes, recherche insensible sur email/nom. */
export async function listUsers(input: {
  query?: string;
  page?: number;
}): Promise<UserListResult> {
  const db = getDb();
  const query = input.query?.trim();
  const where: Prisma.UserWhereInput = query
    ? {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};
  const page = input.page ?? 1;

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        memberships: {
          include: { workspace: { select: { name: true, kind: true } } },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  return {
    total,
    rows: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      memberships: u.memberships.map((m) => ({
        role: m.role,
        workspaceId: m.workspaceId,
        workspaceName: m.workspace.name,
        workspaceKind: m.workspace.kind,
      })),
    })),
  };
}

export type UserDetail = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  hasPassword: boolean;
  memberships: Array<{
    role: string;
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
    workspaceKind: string;
  }>;
  /** Dernière trace AuditLog où ce compte est acteur — null si aucune. */
  lastActivityAt: Date | null;
  /** Dernières lignes d'audit de ce compte (acteur), plus récentes d'abord. */
  recentAudit: Array<{
    id: string;
    action: string;
    entity: string | null;
    entityId: string | null;
    workspaceId: string | null;
    createdAt: Date;
  }>;
};

/** Fiche compte : memberships + activité réelle via AuditLog (actorId). */
export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: { workspace: { select: { name: true, slug: true, kind: true } } },
      },
    },
  });
  if (!user) return null;

  const recentAudit = await db.auditLog.findMany({
    where: { actorId: userId },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      workspaceId: true,
      createdAt: true,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    hasPassword: user.passwordHash !== null,
    memberships: user.memberships.map((m) => ({
      role: m.role,
      workspaceId: m.workspaceId,
      workspaceName: m.workspace.name,
      workspaceSlug: m.workspace.slug,
      workspaceKind: m.workspace.kind,
    })),
    lastActivityAt: recentAudit[0]?.createdAt ?? null,
    recentAudit,
  };
}

// ── Workspaces (esprit ecosystem/operators) ─────────────────────────────

export const WORKSPACE_KIND_FILTERS = ["tous", "AGENCY", "BRAND"] as const;
export type WorkspaceKindFilter = (typeof WORKSPACE_KIND_FILTERS)[number];

export function parseWorkspaceKindFilter(raw: string | undefined): WorkspaceKindFilter {
  return raw === "AGENCY" || raw === "BRAND" ? raw : "tous";
}

export type WorkspaceListRow = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  createdAt: Date;
  memberCount: number;
  brandCount: number;
  /** Abonnement courant : plan actif à l'instant de lecture, sinon null. */
  currentPlan: { plan: string; planLabel: string; expiresAt: Date | null } | null;
  pendingCount: number;
};

export type WorkspaceListResult = { rows: WorkspaceListRow[]; total: number };

/** Label FR d'un plan (clé catalogue vérifiée, sinon la valeur brute). */
export function planLabel(raw: string): string {
  const parsed = planSchema.safeParse(raw);
  return parsed.success ? PLAN_LABELS[parsed.data] : raw;
}

/** Flotte des workspaces + abonnement courant (règles finance réutilisées). */
export async function listWorkspaces(input: {
  query?: string;
  kind?: WorkspaceKindFilter;
  page?: number;
}): Promise<WorkspaceListResult> {
  const db = getDb();
  const query = input.query?.trim();
  const where: Prisma.WorkspaceWhereInput = {
    ...(input.kind && input.kind !== "tous" ? { kind: input.kind } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const page = input.page ?? 1;

  const [workspaces, total] = await Promise.all([
    db.workspace.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        _count: { select: { memberships: true, brands: true } },
        subscriptions: { orderBy: { startedAt: "desc" } },
      },
    }),
    db.workspace.count({ where }),
  ]);

  const now = new Date();
  return {
    total,
    rows: workspaces.map((w) => {
      const active = w.subscriptions.find((s) => subscriptionIsActiveAt(s, now)) ?? null;
      return {
        id: w.id,
        slug: w.slug,
        name: w.name,
        kind: w.kind,
        createdAt: w.createdAt,
        memberCount: w._count.memberships,
        brandCount: w._count.brands,
        currentPlan: active
          ? { plan: active.plan, planLabel: planLabel(active.plan), expiresAt: active.expiresAt }
          : null,
        pendingCount: w.subscriptions.filter((s) => s.status === "pending_manual").length,
      };
    }),
  };
}

export type WorkspaceDetail = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  createdAt: Date;
  members: Array<{
    userId: string;
    role: string;
    email: string;
    name: string | null;
  }>;
  brands: Array<{
    id: string;
    slug: string;
    name: string;
    level: string;
    sector: string | null;
    countryCode: string | null;
    createdAt: Date;
  }>;
  subscriptions: Array<Subscription & { reference: string }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    reference: string | null;
    createdAt: Date;
  }>;
  recentAudit: Array<{
    id: string;
    action: string;
    actorId: string | null;
    entity: string | null;
    createdAt: Date;
  }>;
};

export async function getWorkspaceDetail(id: string): Promise<WorkspaceDetail | null> {
  const db = getDb();
  const workspace = await db.workspace.findUnique({
    where: { id },
    include: {
      memberships: { include: { user: { select: { email: true, name: true } } } },
      brands: { orderBy: { createdAt: "asc" } },
      subscriptions: { orderBy: { startedAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!workspace) return null;

  const recentAudit = await getDb().auditLog.findMany({
    where: { workspaceId: id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, action: true, actorId: true, entity: true, createdAt: true },
  });

  return {
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    kind: workspace.kind,
    createdAt: workspace.createdAt,
    members: workspace.memberships.map((m) => ({
      userId: m.userId,
      role: m.role,
      email: m.user.email,
      name: m.user.name,
    })),
    brands: workspace.brands.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      level: b.level,
      sector: b.sector,
      countryCode: b.countryCode,
      createdAt: b.createdAt,
    })),
    subscriptions: workspace.subscriptions.map((s) => ({
      ...s,
      reference: shortReference(s.id),
    })),
    payments: workspace.payments,
    recentAudit,
  };
}

// ── Abonnements cross-workspace (esprit socle/manual-subscriptions) ─────

/**
 * Statut AFFICHÉ d'une souscription — dérivé des règles finance.ts, pas du
 * seul champ `status` : une ligne `active` dont l'échéance est passée est
 * ÉCHUE (subscriptionIsActiveAt fait foi ; `expiresAt` null n'accorde rien).
 * Fonction pure — testable sans DB.
 */
export type SubscriptionDisplayStatus =
  | "pending"
  | "active"
  | "expired"
  | "rejected"
  | "cancelled"
  | "unknown";

export function subscriptionDisplayStatus(
  sub: Pick<Subscription, "status" | "expiresAt">,
  at: Date,
): SubscriptionDisplayStatus {
  switch (sub.status) {
    case "pending_manual":
      return "pending";
    case "active":
      return subscriptionIsActiveAt(sub, at) ? "active" : "expired";
    case "expired":
      return "expired";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    default:
      return "unknown";
  }
}

export const SUBSCRIPTION_FILTERS = [
  "tous",
  "en_attente",
  "actifs",
  "echus",
  "rejetes",
  "expirent_7j",
] as const;
export type SubscriptionFilter = (typeof SUBSCRIPTION_FILTERS)[number];

export const SUBSCRIPTION_FILTER_LABELS: Record<SubscriptionFilter, string> = {
  tous: "Tous",
  en_attente: "En attente",
  actifs: "Actifs",
  echus: "Échus",
  rejetes: "Rejetés",
  expirent_7j: "Expirent sous 7 j",
};

export function parseSubscriptionFilter(raw: string | undefined): SubscriptionFilter {
  return (SUBSCRIPTION_FILTERS as readonly string[]).includes(raw ?? "")
    ? (raw as SubscriptionFilter)
    : "tous";
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Clause where d'un filtre — pure (l'instant est injecté), testable. */
export function subscriptionFilterWhere(
  filter: SubscriptionFilter,
  at: Date,
): Prisma.SubscriptionWhereInput {
  switch (filter) {
    case "en_attente":
      return { status: "pending_manual" };
    case "actifs":
      return { status: "active", expiresAt: { gt: at } };
    case "echus":
      return {
        OR: [
          { status: "expired" },
          { status: "active", expiresAt: { lte: at } },
          { status: "active", expiresAt: null },
        ],
      };
    case "rejetes":
      return { status: "rejected" };
    case "expirent_7j":
      return {
        status: "active",
        expiresAt: { gt: at, lte: new Date(at.getTime() + 7 * DAY_MS) },
      };
    case "tous":
      return {};
  }
}

export type SubscriptionListRow = {
  id: string;
  reference: string;
  workspaceId: string;
  workspaceName: string;
  plan: string;
  planLabel: string;
  provider: string;
  displayStatus: SubscriptionDisplayStatus;
  startedAt: Date;
  expiresAt: Date | null;
};

export type SubscriptionListResult = {
  rows: SubscriptionListRow[];
  total: number;
  counts: { pending: number; active: number; expiring7d: number };
};

/** Vue cross-workspace des souscriptions, filtrable, paginée. */
export async function listAllSubscriptions(input: {
  filter?: SubscriptionFilter;
  query?: string;
  page?: number;
}): Promise<SubscriptionListResult> {
  const db = getDb();
  const now = new Date();
  const filter = input.filter ?? "tous";
  const query = input.query?.trim();
  const where: Prisma.SubscriptionWhereInput = {
    AND: [
      subscriptionFilterWhere(filter, now),
      ...(query
        ? [{ workspace: { name: { contains: query, mode: "insensitive" as const } } }]
        : []),
    ],
  };
  const page = input.page ?? 1;

  const [subs, total, pending, active, expiring7d] = await Promise.all([
    db.subscription.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { workspace: { select: { name: true } } },
    }),
    db.subscription.count({ where }),
    db.subscription.count({ where: subscriptionFilterWhere("en_attente", now) }),
    db.subscription.count({ where: subscriptionFilterWhere("actifs", now) }),
    db.subscription.count({ where: subscriptionFilterWhere("expirent_7j", now) }),
  ]);

  return {
    total,
    counts: { pending, active, expiring7d },
    rows: subs.map((s) => ({
      id: s.id,
      reference: shortReference(s.id),
      workspaceId: s.workspaceId,
      workspaceName: s.workspace.name,
      plan: s.plan,
      planLabel: planLabel(s.plan),
      provider: s.provider,
      displayStatus: subscriptionDisplayStatus(s, now),
      startedAt: s.startedAt,
      expiresAt: s.expiresAt,
    })),
  };
}

// ── Référentiels : Country + ZoneIndex (CRUD réel, audité) ──────────────

/** Code pays/zone : ISO-3166 alpha-2 (CI) ou code de zone monétaire (UEMOA). */
const zoneOrCountryCode = z
  .string()
  .trim()
  .min(2, "Code trop court (2 caractères minimum).")
  .max(12, "Code trop long (12 caractères maximum).")
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/, "Code invalide (lettres/chiffres/tirets).")
  .transform((v) => v.toUpperCase());

export const countryInputSchema = z.object({
  code: z
    .string()
    .trim()
    .length(2, "Code pays ISO-3166 alpha-2 attendu (ex. CI).")
    .regex(/^[A-Za-z]{2}$/, "Code pays ISO-3166 alpha-2 attendu (ex. CI).")
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1, "Nom obligatoire.").max(80),
  currency: z
    .string()
    .trim()
    .length(3, "Devise ISO-4217 attendue (ex. XOF).")
    .regex(/^[A-Za-z]{3}$/, "Devise ISO-4217 attendue (ex. XOF).")
    .transform((v) => v.toUpperCase()),
  zone: z
    .string()
    .trim()
    .max(20)
    .transform((v) => (v === "" ? null : v.toUpperCase())),
});

export type CountryInput = z.infer<typeof countryInputSchema>;

/** Crée ou met à jour un pays (clé = code) — audité `country.upsert`. */
export async function upsertCountry(input: CountryInput, actorId: string) {
  const db = getDb();
  return db.$transaction(async (tx) => {
    const before = await tx.country.findUnique({ where: { code: input.code } });
    const country = await tx.country.upsert({
      where: { code: input.code },
      create: { code: input.code, name: input.name, currency: input.currency, zone: input.zone },
      update: { name: input.name, currency: input.currency, zone: input.zone },
    });
    await logAudit(
      {
        actorId,
        action: "country.upsert",
        entity: "Country",
        entityId: country.code,
        payload: {
          before: before
            ? { name: before.name, currency: before.currency, zone: before.zone }
            : null,
          after: { name: country.name, currency: country.currency, zone: country.zone },
        },
      },
      tx,
    );
    return country;
  });
}

/** Familles connues du seed — le champ reste libre (nouvelle famille possible). */
export const KNOWN_ZONE_INDEX_FAMILIES = ["pricing", "cost-of-living"] as const;

const isoDate = z
  .string()
  .trim()
  .min(1, "Date obligatoire (AAAA-MM-JJ).")
  .transform((v, ctx) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Date invalide (AAAA-MM-JJ attendu)." });
      return z.NEVER;
    }
    return d;
  });

const isoDateOptional = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Date invalide (AAAA-MM-JJ attendu)." });
      return z.NEVER;
    }
    return d;
  });

const zoneIndexFields = {
  family: z
    .string()
    .trim()
    .min(2, "Famille obligatoire (ex. pricing, cost-of-living).")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Famille en minuscules-tirets (ex. cost-of-living)."),
  countryCode: zoneOrCountryCode,
  key: z
    .string()
    .trim()
    .min(2, "Clé obligatoire (ex. plan.cockpit.monthly).")
    .max(80)
    .regex(/^[a-z0-9._-]+$/i, "Clé en caractères simples (lettres, chiffres, . _ -)."),
  value: z.coerce
    .number()
    .refine((v) => Number.isFinite(v), "Valeur numérique obligatoire."),
  // Doctrine « jamais de donnée inventée » : une valeur sans source n'existe pas.
  source: z.string().trim().min(3, "Source obligatoire (min. 3 caractères).").max(200),
  validFrom: isoDate,
  validUntil: isoDateOptional,
};

function checkValidityWindow(ctx: z.core.$RefinementCtx, from: Date, until: Date | null) {
  if (until && until.getTime() <= from.getTime()) {
    ctx.addIssue({
      code: "custom",
      path: ["validUntil"],
      message: "validUntil doit être strictement postérieure à validFrom.",
    });
  }
}

export const zoneIndexCreateSchema = z
  .object(zoneIndexFields)
  .superRefine((v, ctx) => checkValidityWindow(ctx, v.validFrom, v.validUntil));

export type ZoneIndexCreateInput = z.infer<typeof zoneIndexCreateSchema>;

export const zoneIndexUpdateSchema = z
  .object({ id: z.string().min(1).max(64), ...zoneIndexFields })
  .superRefine((v, ctx) => checkValidityWindow(ctx, v.validFrom, v.validUntil));

export type ZoneIndexUpdateInput = z.infer<typeof zoneIndexUpdateSchema>;

export class AdminError extends Error {
  constructor(
    public readonly code: "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

/**
 * Nouvelle ligne d'indice (nouveau barème / nouvelle période de validité).
 * C'est la voie normale pour CHANGER un tarif : on ajoute une ligne avec un
 * nouveau validFrom — la résolution (market.ts) prend la plus récente valide.
 * Audité `zone_index.create`.
 */
export async function createZoneIndex(input: ZoneIndexCreateInput, actorId: string) {
  const db = getDb();
  return db.$transaction(async (tx) => {
    const row = await tx.zoneIndex.create({
      data: {
        family: input.family,
        countryCode: input.countryCode,
        key: input.key,
        value: input.value,
        source: input.source,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
      },
    });
    await logAudit(
      {
        actorId,
        action: "zone_index.create",
        entity: "ZoneIndex",
        entityId: row.id,
        payload: {
          family: row.family,
          countryCode: row.countryCode,
          key: row.key,
          value: row.value,
          source: row.source,
          validFrom: row.validFrom.toISOString(),
          validUntil: row.validUntil?.toISOString() ?? null,
        },
      },
      tx,
    );
    return row;
  });
}

/** Correction en place d'une ligne (faute de frappe, clôture…) — audité avant/après. */
export async function updateZoneIndex(input: ZoneIndexUpdateInput, actorId: string) {
  const db = getDb();
  return db.$transaction(async (tx) => {
    const before = await tx.zoneIndex.findUnique({ where: { id: input.id } });
    if (!before) {
      throw new AdminError("NOT_FOUND", "Ligne d'indice introuvable — a-t-elle été supprimée ?");
    }
    const row = await tx.zoneIndex.update({
      where: { id: input.id },
      data: {
        family: input.family,
        countryCode: input.countryCode,
        key: input.key,
        value: input.value,
        source: input.source,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
      },
    });
    await logAudit(
      {
        actorId,
        action: "zone_index.update",
        entity: "ZoneIndex",
        entityId: row.id,
        payload: {
          before: {
            family: before.family,
            countryCode: before.countryCode,
            key: before.key,
            value: before.value,
            source: before.source,
            validFrom: before.validFrom.toISOString(),
            validUntil: before.validUntil?.toISOString() ?? null,
          },
          after: {
            family: row.family,
            countryCode: row.countryCode,
            key: row.key,
            value: row.value,
            source: row.source,
            validFrom: row.validFrom.toISOString(),
            validUntil: row.validUntil?.toISOString() ?? null,
          },
        },
      },
      tx,
    );
    return row;
  });
}

/**
 * Suppression d'une ligne d'indice (correction rare — préférer la clôture via
 * validUntil pour garder l'historique). La ligne supprimée reste tracée dans
 * l'AuditLog `zone_index.delete` (payload complet).
 */
export async function deleteZoneIndex(id: string, actorId: string) {
  const db = getDb();
  return db.$transaction(async (tx) => {
    const before = await tx.zoneIndex.findUnique({ where: { id } });
    if (!before) {
      throw new AdminError("NOT_FOUND", "Ligne d'indice introuvable — déjà supprimée ?");
    }
    await tx.zoneIndex.delete({ where: { id } });
    await logAudit(
      {
        actorId,
        action: "zone_index.delete",
        entity: "ZoneIndex",
        entityId: id,
        payload: {
          deleted: {
            family: before.family,
            countryCode: before.countryCode,
            key: before.key,
            value: before.value,
            source: before.source,
            validFrom: before.validFrom.toISOString(),
            validUntil: before.validUntil?.toISOString() ?? null,
          },
        },
      },
      tx,
    );
    return before;
  });
}

/** Statut de validité d'une ligne à l'instant `at` — pure. */
export type ZoneIndexValidity = "en_vigueur" | "programme" | "clos";

export function zoneIndexValidity(
  row: { validFrom: Date; validUntil: Date | null },
  at: Date,
): ZoneIndexValidity {
  if (row.validFrom.getTime() > at.getTime()) return "programme";
  if (row.validUntil && row.validUntil.getTime() <= at.getTime()) return "clos";
  return "en_vigueur";
}

export async function listCountries() {
  const db = getDb();
  return db.country.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { brands: true } } },
  });
}

export async function listZoneIndexFamilies(): Promise<string[]> {
  const db = getDb();
  const rows = await db.zoneIndex.findMany({
    distinct: ["family"],
    select: { family: true },
    orderBy: { family: "asc" },
  });
  return rows.map((r) => r.family);
}

export async function listZoneIndexes(input: {
  family?: string;
  countryCode?: string;
  page?: number;
}): Promise<{ rows: ZoneIndex[]; total: number }> {
  const db = getDb();
  const where: Prisma.ZoneIndexWhereInput = {
    ...(input.family ? { family: input.family } : {}),
    ...(input.countryCode
      ? { countryCode: { equals: input.countryCode, mode: "insensitive" } }
      : {}),
  };
  const page = input.page ?? 1;
  const [rows, total] = await Promise.all([
    db.zoneIndex.findMany({
      where,
      orderBy: [
        { family: "asc" },
        { countryCode: "asc" },
        { key: "asc" },
        { validFrom: "desc" },
      ],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.zoneIndex.count({ where }),
  ]);
  return { rows, total };
}

// ── Journal d'audit : liste filtrable + vérification de chaîne ──────────

export type AuditListFilter = {
  action?: string;
  /** "all" (défaut) · "system" (chaîne workspaceId null) · un workspaceId. */
  chain?: string;
  from?: Date;
  to?: Date;
  page?: number;
};

/** where partagé liste/vérification — pure. */
export function auditWhere(filter: {
  action?: string;
  chain?: string;
  from?: Date;
  to?: Date;
}): Prisma.AuditLogWhereInput {
  const chain = filter.chain ?? "all";
  return {
    ...(filter.action ? { action: filter.action } : {}),
    ...(chain === "all" ? {} : { workspaceId: chain === "system" ? null : chain }),
    ...(filter.from || filter.to
      ? {
          createdAt: {
            ...(filter.from ? { gte: filter.from } : {}),
            ...(filter.to ? { lte: filter.to } : {}),
          },
        }
      : {}),
  };
}

export type AuditListRow = {
  id: string;
  createdAt: Date;
  action: string;
  workspaceId: string | null;
  workspaceName: string | null;
  actorId: string | null;
  actorEmail: string | null;
  entity: string | null;
  entityId: string | null;
  selfHash: string;
};

export async function listAuditLogs(
  filter: AuditListFilter,
): Promise<{ rows: AuditListRow[]; total: number }> {
  const db = getDb();
  const where = auditWhere(filter);
  const page = filter.page ?? 1;
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
  ]);

  // AuditLog n'a volontairement pas de FK — on résout les noms à part.
  const workspaceIds = [...new Set(logs.map((l) => l.workspaceId).filter((v): v is string => !!v))];
  const actorIds = [...new Set(logs.map((l) => l.actorId).filter((v): v is string => !!v))];
  const [workspaces, actors] = await Promise.all([
    workspaceIds.length
      ? db.workspace.findMany({ where: { id: { in: workspaceIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    actorIds.length
      ? db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true } })
      : Promise.resolve([]),
  ]);
  const workspaceName = new Map(workspaces.map((w) => [w.id, w.name]));
  const actorEmail = new Map(actors.map((a) => [a.id, a.email]));

  return {
    total,
    rows: logs.map((l) => ({
      id: l.id,
      createdAt: l.createdAt,
      action: l.action,
      workspaceId: l.workspaceId,
      workspaceName: l.workspaceId ? (workspaceName.get(l.workspaceId) ?? null) : null,
      actorId: l.actorId,
      actorEmail: l.actorId ? (actorEmail.get(l.actorId) ?? null) : null,
      entity: l.entity,
      entityId: l.entityId,
      selfHash: l.selfHash,
    })),
  };
}

/** Actions distinctes présentes en base (options du filtre). */
export async function listAuditActions(): Promise<string[]> {
  const db = getDb();
  const rows = await db.auditLog.findMany({
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  });
  return rows.map((r) => r.action);
}

// — Vérification de chaîne (le cœur : recalcul des selfHash) —

export type AuditChainRow = {
  id: string;
  workspaceId: string | null;
  actorId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  payload: unknown;
  prevHash: string | null;
  selfHash: string;
  createdAt: Date;
};

export type ChainBreak = {
  id: string;
  workspaceId: string | null;
  action: string;
  createdAt: Date;
  reason: "HASH_ALTERE" | "CHAINAGE_ROMPU";
  detail: string;
};

export type ChainVerification = {
  ok: boolean;
  scanned: number;
  chains: number;
  breaks: ChainBreak[];
  /** Cap de lignes atteint — resserrer l'intervalle pour tout couvrir. */
  truncated: boolean;
  /**
   * Maillons dont le prevHash pointe AVANT l'intervalle scanné (fenêtre
   * bornée par une date de début) — leur chaînage n'est pas vérifiable
   * localement, ce n'est PAS une rupture.
   */
  boundaryUnverified: number;
};

/**
 * Vérifie l'intégrité d'un lot de lignes d'audit, chaîne PAR chaîne
 * (workspaceId, null = système). Pure — zéro IO, testable sans DB.
 *
 * Deux contrôles par ligne :
 *  1. Intégrité : selfHash === sha256(prevHash + contenu canonique). Toute
 *     altération a posteriori d'un champ signifiant casse ce recalcul.
 *  2. Chaînage : prevHash doit pointer un selfHash déjà vu dans la chaîne.
 *     Tolérance aux fourches documentée (audit.ts) : deux écritures
 *     concurrentes peuvent partager le même prevHash — accepté. Une fenêtre
 *     bornée (`windowBounded`) ne peut pas vérifier le premier maillon de
 *     chaque chaîne : compté `boundaryUnverified`, pas rupture.
 */
export function verifyChainRows(
  rows: readonly AuditChainRow[],
  opts: { windowBounded?: boolean } = {},
): ChainVerification {
  const windowBounded = opts.windowBounded ?? false;
  const byChain = new Map<string, AuditChainRow[]>();
  for (const row of rows) {
    const key = row.workspaceId ?? "__system__";
    const bucket = byChain.get(key);
    if (bucket) bucket.push(row);
    else byChain.set(key, [row]);
  }

  const breaks: ChainBreak[] = [];
  let boundaryUnverified = 0;

  for (const chainRows of byChain.values()) {
    const ordered = [...chainRows].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : 1),
    );
    const seenSelf = new Set<string>();
    const seenPrev = new Set<string>();
    /** Vrai dès qu'un maillon chaîné (prevHash non null) a été vu : après ça,
     *  une « origine » (prevHash null) n'est plus légitime dans cette chaîne. */
    let sawChained = false;

    ordered.forEach((row, index) => {
      // 1. Recalcul du selfHash depuis le contenu stocké.
      const recomputed = computeSelfHash(row.prevHash, {
        workspaceId: row.workspaceId,
        actorId: row.actorId,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        payload: row.payload,
      });
      if (recomputed !== row.selfHash) {
        breaks.push({
          id: row.id,
          workspaceId: row.workspaceId,
          action: row.action,
          createdAt: row.createdAt,
          reason: "HASH_ALTERE",
          detail: `selfHash stocké ${row.selfHash.slice(0, 12)}… ≠ recalculé ${recomputed.slice(0, 12)}… — le contenu de la ligne a été modifié après écriture.`,
        });
      }

      // 2. Chaînage vers l'amont (tolérant aux fourches concurrentes).
      const linked =
        row.prevHash === null
          ? index === 0 || !sawChained
          : seenSelf.has(row.prevHash) || seenPrev.has(row.prevHash);
      if (!linked) {
        if (windowBounded && row.prevHash !== null) {
          // L'amont pointé peut vivre AVANT la fenêtre — non décidable localement.
          // Vérification de chaînage complète = lancer sans date de début.
          boundaryUnverified += 1;
        } else {
          breaks.push({
            id: row.id,
            workspaceId: row.workspaceId,
            action: row.action,
            createdAt: row.createdAt,
            reason: "CHAINAGE_ROMPU",
            detail:
              row.prevHash === null
                ? "prevHash null au milieu d'une chaîne existante — maillon d'origine inattendu."
                : `prevHash ${row.prevHash.slice(0, 12)}… ne correspond à aucun selfHash antérieur — maillon manquant ou supprimé.`,
          });
        }
      }

      seenSelf.add(row.selfHash);
      if (row.prevHash !== null) {
        seenPrev.add(row.prevHash);
        sawChained = true;
      }
    });
  }

  return {
    ok: breaks.length === 0,
    scanned: rows.length,
    chains: byChain.size,
    breaks,
    truncated: false,
    boundaryUnverified,
  };
}

/** Garde-fou : la vérification travaille en mémoire — intervalle à resserrer au-delà. */
export const MAX_VERIFY_ROWS = 2000;

/**
 * Vérification d'intégrité sur un intervalle : recharge les lignes (ordre
 * d'écriture) et recalcule les hash chaîne par chaîne. Lecture pure — aucune
 * mutation, donc pas de ligne d'audit émise.
 */
export async function verifyAuditChains(filter: {
  chain?: string;
  from?: Date;
  to?: Date;
}): Promise<ChainVerification> {
  const db = getDb();
  const rows = await db.auditLog.findMany({
    where: auditWhere({ chain: filter.chain, from: filter.from, to: filter.to }),
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: MAX_VERIFY_ROWS + 1,
  });
  const truncated = rows.length > MAX_VERIFY_ROWS;
  const scanned = truncated ? rows.slice(0, MAX_VERIFY_ROWS) : rows;
  const result = verifyChainRows(
    scanned.map((r) => ({
      id: r.id,
      workspaceId: r.workspaceId,
      actorId: r.actorId,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      payload: r.payload ?? null,
      prevHash: r.prevHash,
      selfHash: r.selfHash,
      createdAt: r.createdAt,
    })),
    { windowBounded: filter.from !== undefined },
  );
  return { ...result, truncated };
}

/** Workspaces (id, name) pour les selects de filtre — léger, borné. */
export async function listWorkspaceOptions(): Promise<Array<{ id: string; name: string }>> {
  const db = getDb();
  return db.workspace.findMany({
    orderBy: { name: "asc" },
    take: 500,
    select: { id: true, name: true },
  });
}
