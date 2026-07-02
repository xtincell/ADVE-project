import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  APPLICATION_STATUS_LABELS,
  AVAILABILITY_LABELS,
  type ApplicationStatus,
  type TalentAvailability,
} from "@/domain/guild";

/**
 * Badges de la Guilde (WP-011) — mapping statut → variant DS centralisé,
 * mêmes conventions que components/campaigns/status.tsx : gold = décision
 * gagnée, coral = attention, inverse = en cours, outline = éteint/terminal.
 */

type Variant = NonNullable<BadgeProps["variant"]>;

const APPLICATION_VARIANTS: Record<ApplicationStatus, Variant> = {
  APPLIED: "inverse",
  SHORTLISTED: "coral",
  ACCEPTED: "gold",
  DECLINED: "outline",
};

const AVAILABILITY_VARIANTS: Record<TalentAvailability, Variant> = {
  AVAILABLE: "gold",
  BUSY: "inverse",
  UNAVAILABLE: "outline",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={APPLICATION_VARIANTS[status]}>{APPLICATION_STATUS_LABELS[status]}</Badge>;
}

export function AvailabilityBadge({ availability }: { availability: TalentAvailability }) {
  return <Badge variant={AVAILABILITY_VARIANTS[availability]}>{AVAILABILITY_LABELS[availability]}</Badge>;
}

const NUMBER_FORMAT = new Intl.NumberFormat("fr-FR");

/** « 75 000 XOF / jour » — devise du référentiel pays, jamais de symbole inventé. */
export function formatDailyRate(dailyRate: number, currency: string): string {
  return `${NUMBER_FORMAT.format(dailyRate)} ${currency} / jour`;
}
