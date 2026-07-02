import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { FleetSubscriptionSnapshot } from "@/server/agency";

/**
 * Badge d'état d'abonnement d'un workspace de la flotte — mapping unique
 * partagé par le dashboard, la liste clients et la fiche client (WP-018).
 */

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const SUB_BADGE: Record<FleetSubscriptionSnapshot["status"], BadgeProps["variant"]> = {
  active: "coral",
  pending: "inverse",
  expired: "outline",
  none: "outline",
};

const SUB_LABEL: Record<FleetSubscriptionSnapshot["status"], string> = {
  active: "Actif",
  pending: "En validation",
  expired: "Échu",
  none: "Aucun",
};

/** Précision d'échéance affichable — null quand il n'y a rien d'honnête à dire. */
export function subscriptionDetail(sub: FleetSubscriptionSnapshot): string | null {
  if (sub.status === "active" && sub.expiresAt) {
    return `jusqu'au ${DATE_FORMAT.format(sub.expiresAt)}`;
  }
  if (sub.status === "expired" && sub.expiresAt) {
    return `le ${DATE_FORMAT.format(sub.expiresAt)}`;
  }
  return null;
}

export function SubscriptionBadge({
  subscription,
  withDetail = true,
}: {
  subscription: FleetSubscriptionSnapshot;
  withDetail?: boolean;
}) {
  const detail = withDetail ? subscriptionDetail(subscription) : null;
  return (
    <>
      <Badge variant={SUB_BADGE[subscription.status]}>{SUB_LABEL[subscription.status]}</Badge>
      {detail ? <span className="ml-2 text-xs text-smoke-2">{detail}</span> : null}
    </>
  );
}
