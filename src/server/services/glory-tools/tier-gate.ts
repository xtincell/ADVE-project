/**
 * Glory Tools — Paid Tier Gate (Phase 16-A).
 *
 * Tout Glory tool dont le manifest déclare `requiresPaidTier: true` doit
 * être protégé par cette barrière : seul un operator avec une `Subscription`
 * active dans la liste des tiers payants peut l'invoquer.
 *
 * Pattern ship-able sans config : retourne TIER_GATE_DENIED de manière
 * structurée (jamais throw), pour que le caller (engine.executeTool) puisse
 * surfacer un CTA "Upgrade plan" propre côté UI.
 *
 * Réutilisable au-delà de Glory tools (Mestor pre-flight pour Intent kinds
 * sensibles, routes admin /console/anubis/mcp pour MCP externes — cf. ADR-0048).
 */

import { db } from "@/lib/db";

/**
 * Tiers payants par défaut — ouvre l'accès aux Glory tools `requiresPaidTier: true`
 * et aux MCP servers externes (Higgsfield, futurs).
 *
 * Exclus volontairement :
 *   - INTAKE_PDF, ORACLE_FULL : one-shots payants (pas un abonnement actif)
 *
 * Override possible per-tool via `paidTierAllowList` dans le manifest.
 */
export const PAID_TIER_KEYS_DEFAULT: readonly string[] = [
  "COCKPIT_MONTHLY",
  "RETAINER_BASIC",
  "RETAINER_PRO",
  "RETAINER_ENTERPRISE",
];

/**
 * Subscription.status values considérés actifs.
 * `trialing` est inclus volontairement : on offre l'accès complet pendant le trial.
 */
const ACTIVE_STATUSES: readonly string[] = ["active", "trialing"];

export interface TierGateResult {
  allowed: boolean;
  matchedTier?: string;
  reason?: string;
  configureUrl?: string;
}

/**
 * Vérifie qu'un operator a un abonnement actif dans un tier payant autorisé.
 *
 * @param operatorId  User.id qui invoque le tool (généralement Strategy.userId).
 * @param allowedTiers  Override de la liste des tiers acceptés ; default = `PAID_TIER_KEYS_DEFAULT`.
 */
export async function checkPaidTier(
  operatorId: string,
  allowedTiers?: readonly string[],
): Promise<TierGateResult> {
  const tiers = allowedTiers && allowedTiers.length > 0 ? allowedTiers : PAID_TIER_KEYS_DEFAULT;

  const sub = await db.subscription.findFirst({
    where: {
      operatorId,
      status: { in: [...ACTIVE_STATUSES] },
      tierKey: { in: [...tiers] },
    },
    select: { tierKey: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) {
    return {
      allowed: false,
      reason: `Aucune souscription active dans tiers payants (${tiers.join(", ")}). Cet outil est réservé aux abonnements payants.`,
      configureUrl: "/cockpit/subscription",
    };
  }

  return { allowed: true, matchedTier: sub.tierKey };
}

/**
 * Sortie structurée standardisée à utiliser quand un caller doit refuser
 * une invocation pour cause de tier gate. Cohérent avec le pattern
 * `DEFERRED_AWAITING_CREDENTIALS` côté credential-vault.
 */
export interface TierGateDenied {
  status: "TIER_GATE_DENIED";
  reason: string;
  configureUrl: string;
  requiredTiers: readonly string[];
}

export function tierGateDenied(
  reason: string,
  allowedTiers?: readonly string[],
): TierGateDenied {
  return {
    status: "TIER_GATE_DENIED",
    reason,
    configureUrl: "/cockpit/subscription",
    requiredTiers: allowedTiers ?? PAID_TIER_KEYS_DEFAULT,
  };
}
