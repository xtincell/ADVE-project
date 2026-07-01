import type { Payment, Subscription } from "@prisma/client";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { logAudit } from "./audit";
import {
  getPlanPricing,
  getPlanQuote,
  MarketError,
  PLAN_KEYS,
  PLAN_LABELS,
  type PlanKey,
  type PlanQuote,
} from "./market";

/**
 * Finance — souscription par paiement manuel WhatsApp + file de validation
 * opérateur (WP-007, l'acquis pragmatique du legacy PR #258 reconduit v7).
 *
 * Cycle : le fondateur demande un plan → `Subscription` `pending_manual`
 * (n'accorde RIEN) → il règle via WhatsApp (message pré-rempli : plan,
 * montant résolu par zone, référence) → l'opérateur Valide (→ `active`,
 * 30 j cockpit / 92 j retainer, `Payment` confirmé) ou Rejette.
 *
 * Doctrine : montants JAMAIS en dur (tout vient de `server/market.ts`),
 * mutation = transaction + `AuditLog` (`subscription.request` / `.approve` /
 * `.reject`), flips de statut atomiques (`updateMany` conditionnel — une
 * demande ne se valide qu'une fois, même sous double-clic).
 */

// ── Constantes & fonctions PURES (testables sans DB) ───────────────────

export const planSchema = z.enum(PLAN_KEYS);

/** Durée accordée à la validation — 30 j (cockpit mensuel) / 92 j (retainer trimestriel). */
export const PLAN_PERIOD_DAYS: Record<PlanKey, number> = {
  cockpit: 30,
  retainer: 92,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Échéance d'un plan validé à `from` — pure : même entrée, même sortie. */
export function computeExpiry(plan: PlanKey, from: Date): Date {
  return new Date(from.getTime() + PLAN_PERIOD_DAYS[plan] * DAY_MS);
}

/**
 * Une souscription est-elle active à l'instant `at` ? Statut `active` ET
 * échéance strictement future. `expiresAt` null (jamais validée / donnée
 * legacy) n'est PAS considérée active — pas d'accès perpétuel implicite.
 */
export function subscriptionIsActiveAt(
  sub: Pick<Subscription, "status" | "expiresAt">,
  at: Date,
): boolean {
  return sub.status === "active" && sub.expiresAt !== null && sub.expiresAt.getTime() > at.getTime();
}

/**
 * Refus de double souscription — pure : y a-t-il déjà une souscription
 * active dans `subs` à l'instant `at` ?
 */
export function hasActiveAt(
  subs: ReadonlyArray<Pick<Subscription, "status" | "expiresAt">>,
  at: Date,
): boolean {
  return subs.some((sub) => subscriptionIsActiveAt(sub, at));
}

/**
 * Référence courte lisible dérivée de l'id (déterministe — l'opérateur
 * réconcilie le message WhatsApp avec la file de validation sans recopier
 * un cuid entier).
 */
export function shortReference(subscriptionId: string): string {
  return `LF-${subscriptionId.slice(-8).toUpperCase()}`;
}

/** Défaut legacy vérifié (legacy/src/server/trpc/routers/payment.ts). */
export const DEFAULT_WHATSAPP_NUMBER = "237694171799";

/** Numéro WhatsApp opérateur — env `MANUAL_PAYMENT_WHATSAPP`, chiffres seuls. */
export function operatorWhatsAppNumber(): string {
  const raw = process.env.MANUAL_PAYMENT_WHATSAPP ?? DEFAULT_WHATSAPP_NUMBER;
  const digits = raw.replace(/\D/g, "");
  return digits || DEFAULT_WHATSAPP_NUMBER;
}

/** Message WhatsApp pré-rempli (FR) — pur, montant non formaté (URL-safe). */
export function buildWhatsAppMessage(
  plan: PlanKey,
  amount: number,
  currency: string,
  reference: string,
): string {
  return (
    `Bonjour, je souhaite activer la formule ${PLAN_LABELS[plan]} de La Fusée ` +
    `(${amount} ${currency}). Référence : ${reference}.`
  );
}

/** Lien wa.me pré-rempli — pur. */
export function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// ── Erreur métier (messages FR prêts à afficher) ───────────────────────

export type FinanceErrorCode = "ALREADY_ACTIVE" | "NOT_PENDING" | "UNKNOWN_PLAN";

export class FinanceError extends Error {
  constructor(
    public readonly code: FinanceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FinanceError";
  }
}

export const SUBSCRIPTION_PROVIDER_MANUAL = "manual_whatsapp";

/** `Subscription.plan` relu depuis la DB (String) → PlanKey vérifié. */
function parsePlan(raw: string): PlanKey {
  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) {
    throw new FinanceError(
      "UNKNOWN_PLAN",
      `Plan « ${raw} » inconnu — cette souscription ne correspond à aucun plan du catalogue.`,
    );
  }
  return parsed.data;
}

// ── Lecture ────────────────────────────────────────────────────────────

/** Le workspace a-t-il une souscription active (status active && expiresAt > now) ? */
export async function hasActiveSubscription(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const active = await db.subscription.findFirst({
    where: { workspaceId, status: "active", expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  return active !== null;
}

export type WorkspaceSubscriptionState = {
  /** Souscription active à l'instant de lecture (au plus une fait foi). */
  active: Subscription | null;
  /** Demandes en attente de validation opérateur, plus récentes d'abord. */
  pending: Subscription[];
  /** true si plus rien d'actif mais qu'une période validée est échue. */
  expired: boolean;
};

/** État de souscription du workspace — l'entrée de la page /app/facturation. */
export async function getSubscriptionState(
  workspaceId: string,
): Promise<WorkspaceSubscriptionState> {
  const db = getDb();
  const now = new Date();
  const subs = await db.subscription.findMany({
    where: { workspaceId },
    orderBy: { startedAt: "desc" },
  });
  const active = subs.find((sub) => subscriptionIsActiveAt(sub, now)) ?? null;
  const pending = subs.filter((sub) => sub.status === "pending_manual");
  const expired =
    !active &&
    subs.some(
      (sub) =>
        (sub.status === "active" || sub.status === "expired") &&
        sub.expiresAt !== null &&
        sub.expiresAt.getTime() <= now.getTime(),
    );
  return { active, pending, expired };
}

// ── Instructions de paiement (montant + WhatsApp + référence) ──────────

export type SubscriptionInstructions = {
  subscriptionId: string;
  reference: string;
  plan: PlanKey;
  planLabel: string;
  amount: number;
  currency: string;
  /** Montant issu d'une ligne placeholder (à confirmer par l'opérateur). */
  placeholder: boolean;
  whatsappNumber: string;
  whatsappUrl: string;
  /** true si une demande ouverte existante a été ré-affichée (pas de doublon). */
  reused: boolean;
};

function buildInstructions(
  subscriptionId: string,
  quote: PlanQuote,
  reused: boolean,
): SubscriptionInstructions {
  const reference = shortReference(subscriptionId);
  const whatsappNumber = operatorWhatsAppNumber();
  const message = buildWhatsAppMessage(quote.plan, quote.amount, quote.currency, reference);
  return {
    subscriptionId,
    reference,
    plan: quote.plan,
    planLabel: PLAN_LABELS[quote.plan],
    amount: quote.amount,
    currency: quote.currency,
    placeholder: quote.placeholder,
    whatsappNumber,
    whatsappUrl: buildWhatsAppUrl(whatsappNumber, message),
    reused,
  };
}

/** Pays de la marque du workspace (la plus ancienne fait foi — cf. brand.ts). */
async function workspaceBrandCountry(workspaceId: string): Promise<string | null> {
  const db = getDb();
  const brand = await db.brand.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: { countryCode: true },
  });
  return brand?.countryCode ?? null;
}

/**
 * Instructions de paiement d'une demande `pending_manual` existante — permet
 * à la page de RE-afficher le bloc (montant, wa.me, référence) sans nouvelle
 * mutation. Le montant est résolu à la lecture (le pricing vit en base).
 */
export async function getInstructionsForSubscription(
  sub: Pick<Subscription, "id" | "plan" | "workspaceId">,
): Promise<SubscriptionInstructions> {
  const plan = parsePlan(sub.plan);
  const countryCode = await workspaceBrandCountry(sub.workspaceId);
  const quote = await getPlanQuote(plan, countryCode);
  return buildInstructions(sub.id, quote, true);
}

// ── Mutations ──────────────────────────────────────────────────────────

export type RequestSubscriptionInput = {
  workspaceId: string;
  plan: PlanKey;
  actorId: string;
};

/**
 * Demande de souscription manuelle. Refuse si une souscription active existe
 * (`FinanceError ALREADY_ACTIVE`). Ré-affiche la demande `pending_manual`
 * existante du même plan plutôt que d'en empiler une nouvelle (file de
 * validation propre — pattern legacy conservé). Sinon : `Subscription`
 * {plan, status pending_manual, provider manual_whatsapp} + AuditLog
 * `subscription.request` en transaction. Retourne les instructions de
 * paiement (numéro WhatsApp, montant du plan résolu par zone, référence).
 */
export async function requestSubscription(
  input: RequestSubscriptionInput,
): Promise<SubscriptionInstructions> {
  const { workspaceId, plan, actorId } = input;
  const db = getDb();

  if (await hasActiveSubscription(workspaceId)) {
    throw new FinanceError(
      "ALREADY_ACTIVE",
      "Ce workspace a déjà un abonnement actif — inutile de payer à nouveau avant son échéance.",
    );
  }

  const countryCode = await workspaceBrandCountry(workspaceId);
  const quote = await getPlanQuote(plan, countryCode);

  const existing = await db.subscription.findFirst({
    where: { workspaceId, plan, status: "pending_manual" },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
  if (existing) return buildInstructions(existing.id, quote, true);

  const created = await db.$transaction(async (tx) => {
    const sub = await tx.subscription.create({
      data: {
        workspaceId,
        plan,
        status: "pending_manual",
        provider: SUBSCRIPTION_PROVIDER_MANUAL,
        expiresAt: null, // n'accorde RIEN tant que l'opérateur n'a pas validé
      },
    });
    await logAudit(
      {
        workspaceId,
        actorId,
        action: "subscription.request",
        entity: "Subscription",
        entityId: sub.id,
        payload: {
          plan,
          reference: shortReference(sub.id),
          expectedAmount: quote.amount,
          currency: quote.currency,
          zone: quote.zone,
          placeholder: quote.placeholder,
        },
      },
      tx,
    );
    return sub;
  });

  return buildInstructions(created.id, quote, false);
}

export type ApproveSubscriptionInput = { id: string; actorId: string };

export type ApproveSubscriptionResult = {
  subscription: Subscription;
  payment: Payment;
};

/**
 * Validation opérateur d'une demande manuelle. Transaction unique :
 * flip atomique `pending_manual` → `active` (startedAt now, expiresAt
 * +30 j cockpit / +92 j retainer) + `Payment` {montant du plan résolu par
 * zone, devise, method manual_whatsapp, status confirmed, référence courte}
 * + AuditLog `subscription.approve`. Une demande déjà traitée (ou en cours
 * de traitement concurrent) est refusée — `FinanceError NOT_PENDING`.
 */
export async function approveSubscription(
  input: ApproveSubscriptionInput,
): Promise<ApproveSubscriptionResult> {
  const { id, actorId } = input;
  const db = getDb();

  const sub = await db.subscription.findUnique({ where: { id } });
  if (!sub || sub.status !== "pending_manual") {
    throw new FinanceError(
      "NOT_PENDING",
      "Demande introuvable ou déjà traitée — la file de validation a peut-être bougé.",
    );
  }
  const plan = parsePlan(sub.plan);

  // Montant résolu AVANT la transaction (lecture référentiel, non mutante).
  const countryCode = await workspaceBrandCountry(sub.workspaceId);
  const quote = await getPlanQuote(plan, countryCode);

  return db.$transaction(async (tx) => {
    const now = new Date();
    const expiresAt = computeExpiry(plan, now);

    // Flip atomique : ne réussit qu'une fois, même sous double-clic.
    const flipped = await tx.subscription.updateMany({
      where: { id, status: "pending_manual" },
      data: { status: "active", startedAt: now, expiresAt },
    });
    if (flipped.count === 0) {
      throw new FinanceError(
        "NOT_PENDING",
        "Demande déjà traitée par un autre opérateur — rien à valider.",
      );
    }
    const subscription = await tx.subscription.findUniqueOrThrow({ where: { id } });

    const payment = await tx.payment.create({
      data: {
        workspaceId: sub.workspaceId,
        amount: quote.amount,
        currency: quote.currency,
        method: SUBSCRIPTION_PROVIDER_MANUAL,
        status: "confirmed",
        reference: shortReference(id),
      },
    });

    await logAudit(
      {
        workspaceId: sub.workspaceId,
        actorId,
        action: "subscription.approve",
        entity: "Subscription",
        entityId: id,
        payload: {
          plan,
          amount: quote.amount,
          currency: quote.currency,
          zone: quote.zone,
          paymentId: payment.id,
          reference: shortReference(id),
          expiresAt: expiresAt.toISOString(),
        },
      },
      tx,
    );

    return { subscription, payment };
  });
}

export type RejectSubscriptionInput = { id: string; actorId: string };

/**
 * Rejet opérateur d'une demande manuelle : flip atomique `pending_manual` →
 * `rejected` + AuditLog `subscription.reject` — transaction, aucun Payment.
 */
export async function rejectSubscription(input: RejectSubscriptionInput): Promise<Subscription> {
  const { id, actorId } = input;
  const db = getDb();

  const sub = await db.subscription.findUnique({ where: { id } });
  if (!sub || sub.status !== "pending_manual") {
    throw new FinanceError(
      "NOT_PENDING",
      "Demande introuvable ou déjà traitée — la file de validation a peut-être bougé.",
    );
  }

  return db.$transaction(async (tx) => {
    const flipped = await tx.subscription.updateMany({
      where: { id, status: "pending_manual" },
      data: { status: "rejected" },
    });
    if (flipped.count === 0) {
      throw new FinanceError(
        "NOT_PENDING",
        "Demande déjà traitée par un autre opérateur — rien à rejeter.",
      );
    }
    await logAudit(
      {
        workspaceId: sub.workspaceId,
        actorId,
        action: "subscription.reject",
        entity: "Subscription",
        entityId: id,
        payload: { plan: sub.plan, reference: shortReference(id) },
      },
      tx,
    );
    return tx.subscription.findUniqueOrThrow({ where: { id } });
  });
}

// ── File de validation (console admin) ─────────────────────────────────

export type PendingSubscriptionRow = {
  id: string;
  reference: string;
  plan: PlanKey | null;
  planLabel: string;
  workspaceId: string;
  workspaceName: string;
  requestedAt: Date;
  /** Montant attendu résolu par zone — null si référentiel pricing non seedé. */
  expected: PlanQuote | null;
};

/**
 * Demandes `pending_manual`, plus anciennes d'abord (une file se traite dans
 * l'ordre d'arrivée), enrichies du montant attendu résolu par zone de la
 * marque du workspace. Un pricing irrésoluble ne casse pas la file :
 * `expected: null`, l'UI l'affiche honnêtement.
 */
export async function listPendingSubscriptions(): Promise<PendingSubscriptionRow[]> {
  const db = getDb();
  const subs = await db.subscription.findMany({
    where: { status: "pending_manual" },
    orderBy: { startedAt: "asc" },
    include: {
      workspace: {
        select: {
          name: true,
          brands: { orderBy: { createdAt: "asc" }, take: 1, select: { countryCode: true } },
        },
      },
    },
  });

  // Cache par pays : la file partage souvent la même zone de pricing.
  const quoteCache = new Map<string, Record<PlanKey, PlanQuote> | null>();
  const rows: PendingSubscriptionRow[] = [];
  for (const sub of subs) {
    const parsed = planSchema.safeParse(sub.plan);
    const plan = parsed.success ? parsed.data : null;

    let expected: PlanQuote | null = null;
    if (plan) {
      const countryCode = sub.workspace.brands[0]?.countryCode ?? null;
      const cacheKey = countryCode ?? "";
      if (!quoteCache.has(cacheKey)) {
        try {
          quoteCache.set(cacheKey, (await getPlanPricing(countryCode)).byPlan);
        } catch (err) {
          if (!(err instanceof MarketError)) throw err;
          quoteCache.set(cacheKey, null); // référentiel non seedé — affiché tel quel
        }
      }
      expected = quoteCache.get(cacheKey)?.[plan] ?? null;
    }

    rows.push({
      id: sub.id,
      reference: shortReference(sub.id),
      plan,
      planLabel: plan ? PLAN_LABELS[plan] : sub.plan,
      workspaceId: sub.workspaceId,
      workspaceName: sub.workspace.name,
      requestedAt: sub.startedAt,
      expected,
    });
  }
  return rows;
}

export type SubscriptionHistoryRow = Subscription & {
  reference: string;
  workspaceName: string;
};

/** Historique des dernières décisions (validées — mêmes échues — et rejetées). */
export async function listRecentSubscriptionDecisions(
  take = 20,
): Promise<SubscriptionHistoryRow[]> {
  const db = getDb();
  const subs = await db.subscription.findMany({
    where: { status: { in: ["active", "expired", "rejected"] } },
    orderBy: { startedAt: "desc" },
    take,
    include: { workspace: { select: { name: true } } },
  });
  return subs.map(({ workspace, ...sub }) => ({
    ...sub,
    reference: shortReference(sub.id),
    workspaceName: workspace.name,
  }));
}
