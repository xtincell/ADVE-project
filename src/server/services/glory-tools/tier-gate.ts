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
  // Fix Vague 5 — la clé canonique est RETAINER_BASE (pricing-tiers.ts) ;
  // "RETAINER_BASIC" n'a jamais existé : les abonnés BASE étaient refusés.
  "RETAINER_BASE",
  "RETAINER_PRO",
  "RETAINER_ENTERPRISE",
];

/**
 * Subscription.status values considérés actifs.
 * `trialing` est inclus volontairement : on offre l'accès complet pendant le trial.
 */
const ACTIVE_STATUSES: readonly string[] = ["active", "trialing"];

/**
 * Tiers dont l'abonnement couvre PLUSIEURS marques d'un même operator.
 * `RETAINER_ENTERPRISE` = « Multi-brand orchestration (jusqu'à 5 marques) »
 * (pricing-tiers.ts:158-176). Un tel abonnement est traité comme operator-wide
 * même s'il porte un `strategyId` — sinon on restreindrait à tort un payeur
 * multi-marques à une seule de ses marques (F5 : « ne jamais restreindre
 * ENTERPRISE »). Ne fait que GRANTER — ne restreint jamais.
 */
export const MULTI_BRAND_TIER_KEYS: readonly string[] = ["RETAINER_ENTERPRISE"];

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
 * @param strategyId  F5 — scope par marque. **Fourni** : ne comptent que
 *   l'abonnement scopé à CETTE marque (`strategyId = <marque>`), OU un abonnement
 *   legacy operator-wide (`strategyId = null` — filet de backward-compat, matche
 *   toute marque), OU un tier multi-marques (`MULTI_BRAND_TIER_KEYS`). **Absent** :
 *   comportement inchangé (operator-wide) — backward-compat pur pour les callers
 *   non encore migrés.
 */
export async function checkPaidTier(
  operatorId: string,
  allowedTiers?: readonly string[],
  strategyId?: string,
): Promise<TierGateResult> {
  const tiers = allowedTiers && allowedTiers.length > 0 ? allowedTiers : PAID_TIER_KEYS_DEFAULT;

  // Audit 2026-07-16 `manual-wa-subscription-never-expires` — ceinture en plus
  // du sweep quotidien : une période échue (au-delà de 3 j de grâce) ne donne
  // plus accès même si le statut n'a pas encore été balayé. Null-tolerant :
  // les abonnements provider sans période matérialisée restent pilotés par status.
  const graceCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const sub = await db.subscription.findFirst({
    where: {
      operatorId,
      status: { in: [...ACTIVE_STATUSES] },
      tierKey: { in: [...tiers] },
      // OR grâce-période (INCHANGÉ) — reste au top-level.
      OR: [
        { currentPeriodEnd: null },
        { currentPeriodEnd: { gte: graceCutoff } },
      ],
      // F5 — scope par marque. N'est ajouté QUE si un `strategyId` est fourni ⇒
      // sans strategyId, le `where` est identique au comportement pré-F5
      // (operator-wide pur, aucun payeur non migré n'est affecté). Niché sous
      // `AND` pour que les DEUX ORs (grâce + scope) tiennent ENSEMBLE au lieu
      // d'entrer en collision (un même objet ne peut porter qu'une clé `OR`).
      ...(strategyId
        ? {
            AND: [
              {
                OR: [
                  // Backward-compat : sub legacy/operator-wide → matche TOUTE
                  // marque. Aucun sub existant (tous créés `strategyId = null`
                  // avant F5) ne perd l'accès.
                  { strategyId: null },
                  // Sub scopé à cette marque → ne débloque QUE cette marque.
                  { strategyId },
                  // ENTERPRISE multi-marques → jamais restreint à une seule
                  // marque, même s'il porte un strategyId (ne fait que granter).
                  { tierKey: { in: [...MULTI_BRAND_TIER_KEYS] } },
                ],
              },
            ],
          }
        : {}),
    },
    select: { tierKey: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) {
    // God mode — un operator piloté par un founder de l'allowlist n'est jamais
    // bloqué par un tier gate (résolu seulement ici, au moment du refus, pour
    // ne pas alourdir le chemin nominal des abonnés payants).
    // FIX 2026-07-13 : le paramètre `operatorId` est en pratique un User.id
    // (Strategy.userId) sur les chemins cockpit — l'ancien lookup ne matchait
    // que `User.operatorId` → le bypass ADMIN ne s'appliquait JAMAIS et le
    // compte god-mode voyait les cadenas (bug rapporté opérateur).
    const { isGodModeEmail } = await import("@/lib/auth/god-mode");
    const godUser = await db.user.findFirst({
      where: {
        OR: [{ id: operatorId }, { operatorId }],
        role: "ADMIN",
      },
      select: { email: true },
    });
    if (isGodModeEmail(godUser?.email)) {
      return { allowed: true, matchedTier: "GOD_MODE" };
    }
    return {
      allowed: false,
      reason: `Aucune souscription active dans tiers payants (${tiers.join(", ")}). Cet outil est réservé aux abonnements payants.`,
      configureUrl: "/pricing",
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
    configureUrl: "/pricing",
    requiredTiers: allowedTiers ?? PAID_TIER_KEYS_DEFAULT,
  };
}
