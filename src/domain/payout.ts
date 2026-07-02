/**
 * Domaine commissions talents — pur TS, zéro IO (WP-024).
 *
 * La boucle guilde → mobile money : quand la marque valide une mission gagnée
 * via la Guilde, un ordre de gain (`TalentPayout`) naît avec un brut, une
 * commission et un net FIGÉS à la création. Tout le calcul vit ici, pur et
 * testé sans base :
 *
 *   brut     = dailyRate × jours (assignedAt → deliveredAt) si dérivable,
 *              sinon montant DÉCLARÉ par la marque au formulaire — jamais inventé ;
 *   taux     = référentiel ZoneIndex famille "commission" (lu côté serveur,
 *              normalisé ici : une valeur hors [0, 1) est un trou, pas un taux) ;
 *   commission = round(brut × taux) ; net = brut − commission
 *              (invariant : net + commission = brut, testé).
 *
 * Le circuit opérateur est une machine d'états sans saut ni retour :
 * PENDING → APPROVED → PAID, avec sortie terminale PENDING → REJECTED.
 */

// ── Statuts & méthodes (miroirs de l'enum Prisma tranche 5) ─────────────

export const PAYOUT_STATUSES = ["PENDING", "APPROVED", "PAID", "REJECTED"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

/** Libellés FR (registre client — jamais d'enum brut à l'écran). */
export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  PAID: "Payé",
  REJECTED: "Écarté",
};

export const PAYOUT_METHODS = ["momo", "manual"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  momo: "Mobile money",
  manual: "Manuel (hors momo)",
};

// ── Machine d'états (chaque refus porte sa raison, prête à afficher) ────

export type PayoutGateCheck = { ok: true } | { ok: false; reason: string };

/** Transitions autorisées du circuit opérateur — sans saut ni retour. */
export const PAYOUT_TRANSITIONS: Record<PayoutStatus, readonly PayoutStatus[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["PAID"],
  PAID: [],
  REJECTED: [],
};

export function canTransitionPayout(from: PayoutStatus, to: PayoutStatus): PayoutGateCheck {
  if (PAYOUT_TRANSITIONS[from].includes(to)) return { ok: true };
  return {
    ok: false,
    reason:
      `Passage « ${PAYOUT_STATUS_LABELS[from]} » → « ${PAYOUT_STATUS_LABELS[to]} » impossible — ` +
      "le circuit d'un gain est : en attente → approuvé → payé (ou écarté en attente), sans saut ni retour.",
  };
}

// ── Calculs (déterministes, testés sur les arrondis) ────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Jours facturables d'une mission : plafond du délai assignation → livraison
 * (un jour entamé est dû), minimum 1 (livrer le jour même = 1 jour). Null si
 * une des deux dates manque — le brut n'est alors PAS dérivable du tarif.
 */
export function computeMissionDays(
  assignedAt: Date | null | undefined,
  deliveredAt: Date | null | undefined,
): number | null {
  if (!assignedAt || !deliveredAt) return null;
  const elapsed = deliveredAt.getTime() - assignedAt.getTime();
  if (!Number.isFinite(elapsed)) return null;
  return Math.max(1, Math.ceil(elapsed / DAY_MS));
}

/**
 * Brut estimé depuis le tarif journalier DÉCLARÉ du talent : dailyRate × jours.
 * Null si l'un des deux facteurs manque ou est inutilisable — l'appelant exige
 * alors un montant saisi par la marque, jamais un chiffre inventé.
 */
export function estimateGrossFromDailyRate(
  dailyRate: number | null | undefined,
  days: number | null | undefined,
): number | null {
  if (typeof dailyRate !== "number" || !Number.isInteger(dailyRate) || dailyRate <= 0) return null;
  if (typeof days !== "number" || !Number.isInteger(days) || days <= 0) return null;
  return dailyRate * days;
}

/**
 * Taux de commission relu du référentiel → fraction vérifiée. Une valeur hors
 * [0, 1) (ex. « 15 » saisi au lieu de « 0.15 ») n'est PAS un taux : null,
 * traité comme un trou de référentiel — honnête, jamais appliqué tel quel.
 */
export function normalizeCommissionRate(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value >= 1) return null;
  return value;
}

export type PayoutBreakdown = {
  amountGross: number;
  commissionRate: number;
  /** round(brut × taux) — arrondi au plus proche, unité mineure de la devise. */
  commissionAmount: number;
  /** brut − commission : l'addition retombe TOUJOURS sur le brut (testé). */
  amountNet: number;
};

/** Garde int32 (colonne Prisma `Int`) — au-delà, le montant est inutilisable. */
export const MAX_PAYOUT_GROSS = 2_147_483_647;

/**
 * Ventile un brut en commission + net au taux donné. Null si les entrées sont
 * inutilisables (brut non entier positif ou hors garde int32, taux hors
 * [0, 1)) — l'appelant refuse alors l'opération plutôt que de créer un ordre
 * faux.
 */
export function computePayoutBreakdown(
  amountGross: number,
  commissionRate: number,
): PayoutBreakdown | null {
  if (!Number.isInteger(amountGross) || amountGross <= 0 || amountGross > MAX_PAYOUT_GROSS) {
    return null;
  }
  if (normalizeCommissionRate(commissionRate) === null) return null;
  const commissionAmount = Math.round(amountGross * commissionRate);
  return {
    amountGross,
    commissionRate,
    commissionAmount,
    amountNet: amountGross - commissionAmount,
  };
}

// ── Agrégation par devise (deux devises ne s'additionnent jamais) ───────

export type PayoutMoneyLike = {
  status: PayoutStatus;
  currency: string;
  amountGross: number;
  commissionAmount: number;
  amountNet: number;
};

export type PayoutSummary = {
  counts: Record<PayoutStatus, number>;
  /** Commissions générées PAR DEVISE — ordres vivants (REJECTED exclu). */
  generatedCommissionByCurrency: Record<string, number>;
  /** Commissions effectivement encaissées (status PAID) PAR DEVISE. */
  paidCommissionByCurrency: Record<string, number>;
  /** Net dû aux talents encore à régler (PENDING + APPROVED) PAR DEVISE. */
  dueNetByCurrency: Record<string, number>;
  /** Net déjà reversé aux talents (PAID) PAR DEVISE. */
  paidNetByCurrency: Record<string, number>;
};

/**
 * Résumé d'un lot d'ordres de gain : compteurs par statut + totaux PAR DEVISE
 * (doctrine WP-018 reconduite : XOF et XAF sont à parité mais restent des
 * devises distinctes — on ne mélange pas). Vide → tout vide.
 */
export function summarizePayouts(rows: ReadonlyArray<PayoutMoneyLike>): PayoutSummary {
  const counts: Record<PayoutStatus, number> = {
    PENDING: 0,
    APPROVED: 0,
    PAID: 0,
    REJECTED: 0,
  };
  const generatedCommissionByCurrency: Record<string, number> = {};
  const paidCommissionByCurrency: Record<string, number> = {};
  const dueNetByCurrency: Record<string, number> = {};
  const paidNetByCurrency: Record<string, number> = {};

  for (const row of rows) {
    counts[row.status] += 1;
    if (row.status === "REJECTED") continue;
    generatedCommissionByCurrency[row.currency] =
      (generatedCommissionByCurrency[row.currency] ?? 0) + row.commissionAmount;
    if (row.status === "PAID") {
      paidCommissionByCurrency[row.currency] =
        (paidCommissionByCurrency[row.currency] ?? 0) + row.commissionAmount;
      paidNetByCurrency[row.currency] = (paidNetByCurrency[row.currency] ?? 0) + row.amountNet;
    } else {
      dueNetByCurrency[row.currency] = (dueNetByCurrency[row.currency] ?? 0) + row.amountNet;
    }
  }

  return {
    counts,
    generatedCommissionByCurrency,
    paidCommissionByCurrency,
    dueNetByCurrency,
    paidNetByCurrency,
  };
}
