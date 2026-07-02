import { Badge, type BadgeProps } from "@/components/ui/badge";
import { PAYOUT_STATUS_LABELS, type PayoutStatus } from "@/domain/payout";

/**
 * Badges & formats des gains talents (WP-024) — mêmes conventions que
 * components/campaigns/status.tsx : gold = décision gagnée (payé), coral =
 * attention (à payer), inverse = en cours, outline = éteint/terminal.
 * Fonctions PURES, importables des deux côtés (server components + clients).
 */

type Variant = NonNullable<BadgeProps["variant"]>;

const PAYOUT_VARIANTS: Record<PayoutStatus, Variant> = {
  PENDING: "inverse",
  APPROVED: "coral",
  PAID: "gold",
  REJECTED: "outline",
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  return <Badge variant={PAYOUT_VARIANTS[status]}>{PAYOUT_STATUS_LABELS[status]}</Badge>;
}

const NUMBER_FORMAT = new Intl.NumberFormat("fr-FR");
const RATE_FORMAT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** Convention finance v7 : les francs CFA (XOF/XAF) se disent « FCFA ». */
export function formatMoney(amount: number, currency: string): string {
  const unit = currency === "XOF" || currency === "XAF" ? "FCFA" : currency;
  return `${NUMBER_FORMAT.format(amount)} ${unit}`;
}

/** Fraction du référentiel → pourcentage lisible (0.15 → « 15 % »). */
export function formatRate(rate: number): string {
  return `${RATE_FORMAT.format(rate * 100)} %`;
}

/** Totaux par devise → ligne affichable, devises triées (jamais additionnées). */
export function totalsLine(totals: Record<string, number>): string {
  const entries = Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
  return entries.length > 0
    ? entries.map(([currency, amount]) => formatMoney(amount, currency)).join(" · ")
    : "—";
}
