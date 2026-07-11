/**
 * Libellés client canon des abonnements — module UNIQUE partagé par
 * `/cockpit/settings` et `/cockpit/settings/billing` (lot 14, audit UX
 * 2026-07-11 [M11-01] : les deux pages définissaient des jeux de clés ET de
 * libellés divergents — « Accompagnement/Growth/Scale » vs « Retainer
 * Base/Pro/Enterprise », « Résilié » vs « Annulé »).
 *
 * Clés = SSOT `src/server/services/monetization/pricing-tiers.ts` (les clés
 * GROWTH/SCALE affichées par settings n'existaient pas). Libellés alignés
 * sur ce que le client a ACHETÉ sur /pricing — la cohérence avec le nom
 * d'achat prime sur la francisation (T7). Exception Lot 0 (ADR-0123) :
 * « Rapport ADVE+RTIS » → « Rapport de diagnostic » côté client.
 */

export const TIER_LABELS: Record<string, string> = {
  INTAKE_FREE: "Audit gratuit",
  INTAKE_PDF: "Rapport de diagnostic",
  ORACLE_FULL: "Oracle complet",
  COCKPIT_MONTHLY: "Cockpit (mensuel)",
  RETAINER_BASE: "Retainer Base",
  RETAINER_PRO: "Retainer Pro",
  RETAINER_ENTERPRISE: "Retainer Enterprise",
};

export type SubscriptionStatusTone = "ok" | "warn" | "muted";

export const SUBSCRIPTION_STATUS_LABELS: Record<string, { label: string; tone: SubscriptionStatusTone }> = {
  active: { label: "Actif", tone: "ok" },
  trialing: { label: "Période d'essai", tone: "ok" },
  pending_manual: { label: "En attente de validation opérateur", tone: "warn" },
  past_due: { label: "Paiement en retard", tone: "warn" },
  unpaid: { label: "Impayé", tone: "warn" },
  canceled: { label: "Résilié", tone: "muted" },
};
