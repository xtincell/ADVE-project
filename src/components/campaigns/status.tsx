import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  ACTION_STATUS_LABELS,
  BRIEF_STATUS_LABELS,
  CAMPAIGN_STATUS_LABELS,
  MISSION_STATUS_LABELS,
  type BriefStatus,
  type CampaignActionStatus,
  type CampaignStatus,
  type MissionStatus,
} from "@/domain/campaign";

/**
 * Badges de statut du pipeline campagnes (WP-008) — mapping statut → variant
 * DS centralisé (conventions de l'espace sombre : gold = accompli/actif,
 * coral = attention opérateur, inverse = en cours, outline = éteint).
 */

type Variant = NonNullable<BadgeProps["variant"]>;

const CAMPAIGN_VARIANTS: Record<CampaignStatus, Variant> = {
  DRAFT: "inverse",
  ACTIVE: "gold",
  ARCHIVED: "outline",
};

const ACTION_VARIANTS: Record<CampaignActionStatus, Variant> = {
  PLANNED: "inverse",
  BRIEFED: "gold",
  CANCELLED: "outline",
};

const BRIEF_VARIANTS: Record<BriefStatus, Variant> = {
  DRAFT: "inverse",
  VALIDATED: "gold",
};

const MISSION_VARIANTS: Record<MissionStatus, Variant> = {
  OPEN: "outline",
  ASSIGNED: "inverse",
  DELIVERED: "coral",
  VALIDATED: "gold",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge variant={CAMPAIGN_VARIANTS[status]}>{CAMPAIGN_STATUS_LABELS[status]}</Badge>;
}

export function ActionStatusBadge({ status }: { status: CampaignActionStatus }) {
  return <Badge variant={ACTION_VARIANTS[status]}>{ACTION_STATUS_LABELS[status]}</Badge>;
}

export function BriefStatusBadge({ status }: { status: BriefStatus }) {
  return <Badge variant={BRIEF_VARIANTS[status]}>{BRIEF_STATUS_LABELS[status]}</Badge>;
}

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  return <Badge variant={MISSION_VARIANTS[status]}>{MISSION_STATUS_LABELS[status]}</Badge>;
}

/** Badge « à estimer » — le trou de référentiel s'affiche, il ne se masque pas. */
export function ToEstimateBadge() {
  return <Badge variant="coral">À estimer</Badge>;
}

// ── Formatage (fr-FR, devise en code ISO — XOF/XAF n'ont pas de symbole) ──

const NUMBER_FORMAT = new Intl.NumberFormat("fr-FR");

export function formatAmount(amount: number, currency: string | null): string {
  return currency ? `${NUMBER_FORMAT.format(amount)} ${currency}` : NUMBER_FORMAT.format(amount);
}

export const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
