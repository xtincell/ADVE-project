import type { BadgeProps } from "@/components/ui/badge";
import type { SubscriptionDisplayStatus } from "@/server/admin";

/** Rendu FR des statuts dérivés d'abonnement (règles finance) — fond clair. */
export const SUBSCRIPTION_STATUS_BADGES: Record<
  SubscriptionDisplayStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  pending: { label: "En attente", variant: "coral" },
  active: { label: "Actif", variant: "gold" },
  expired: { label: "Échu", variant: "neutral" },
  rejected: { label: "Rejeté", variant: "outline" },
  cancelled: { label: "Annulé", variant: "outline" },
  unknown: { label: "Statut inconnu", variant: "outline" },
};
