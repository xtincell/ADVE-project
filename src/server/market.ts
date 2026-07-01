import { getDb } from "@/lib/db";

/**
 * Market — résolution du pricing des plans par zone monétaire (WP-007).
 *
 * Doctrine (héritée ADR-0087 legacy, reconduite v7 §2 REBUILD-PLAN) : JAMAIS
 * de barème en dur dans le code. Les montants vivent en base dans `ZoneIndex`
 * famille "pricing" (seedés par prisma/seed.mjs — granularité zone monétaire :
 * `countryCode` porte le code de zone UEMOA / CEMAC, joignable via
 * `Country.zone`). Ce module est un PUR lookup DB :
 *
 *   pays → `Country.zone` (fallback UEMOA si pays inconnu / hors zone) →
 *   lignes `ZoneIndex(family="pricing", countryCode=zone)` valides à date →
 *   devise dérivée de la zone (devise commune des pays de la zone — les zones
 *   sont monétaires par construction, aucun mapping en dur).
 *
 * Une ligne dont la `source` contient "placeholder" est un montant posé par
 * le seed en attente de confirmation opérateur — surfacé `placeholder: true`,
 * jamais masqué (doctrine « données inventées interdites »).
 */

// ── Plans (identifiants + clés de données — aucun montant ici) ─────────

export const PLAN_KEYS = ["cockpit", "retainer"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const PLAN_LABELS: Record<PlanKey, string> = {
  cockpit: "Cockpit",
  retainer: "Retainer",
};

/** Cadence de facturation affichable (le retainer se règle au trimestre). */
export const PLAN_CADENCE_LABELS: Record<PlanKey, string> = {
  cockpit: "/ mois",
  retainer: "/ trimestre",
};

/** Clés `ZoneIndex.key` de la famille "pricing" (cf. prisma/seed.mjs). */
export const PLAN_PRICING_KEYS: Record<PlanKey, string> = {
  cockpit: "plan.cockpit.monthly",
  retainer: "plan.retainer.quarterly",
};

export const PRICING_FAMILY = "pricing";

/** Zone de repli quand le pays est inconnu / hors zone seedée (consigne WP-007). */
export const FALLBACK_ZONE = "UEMOA";

/** Une source de seed marquée "placeholder" attend une confirmation opérateur. */
export function isPlaceholderSource(source: string): boolean {
  return source.toLowerCase().includes("placeholder");
}

// ── Erreur métier (référentiel non seedé — jamais de montant inventé) ──

export class MarketError extends Error {
  constructor(
    public readonly code: "PRICING_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "MarketError";
  }
}

// ── Types de sortie ────────────────────────────────────────────────────

/** Prix résolu d'UN plan pour une zone (l'unité de la souscription). */
export type PlanQuote = {
  plan: PlanKey;
  /** Montant entier dans la devise de zone (XOF/XAF : exposant ISO 0). */
  amount: number;
  currency: string;
  zone: string;
  source: string;
  placeholder: boolean;
};

export type PlanPricing = {
  zone: string;
  currency: string;
  cockpitMonthly: number;
  retainerQuarterly: number;
  /** Sources distinctes des lignes consommées (traçabilité affichable). */
  source: string;
  /** true si AU MOINS une ligne consommée est un placeholder. */
  placeholder: boolean;
  /** Détail par plan — permet de badger « à confirmer » plan par plan. */
  byPlan: Record<PlanKey, PlanQuote>;
};

// ── Résolution ─────────────────────────────────────────────────────────

/** Zone de pricing d'un pays : `Country.zone`, fallback UEMOA. */
async function resolvePricingZone(countryCode?: string | null): Promise<string> {
  if (!countryCode) return FALLBACK_ZONE;
  const db = getDb();
  const country = await db.country.findUnique({
    where: { code: countryCode },
    select: { zone: true },
  });
  return country?.zone ?? FALLBACK_ZONE;
}

/**
 * Devise d'une zone monétaire, dérivée de la DB (devise commune des pays de
 * la zone — UEMOA→XOF, CEMAC→XAF par les données, pas par le code).
 */
async function resolveZoneCurrency(zone: string): Promise<string> {
  const db = getDb();
  const country = await db.country.findFirst({
    where: { zone },
    orderBy: { code: "asc" },
    select: { currency: true },
  });
  if (!country) {
    throw new MarketError(
      "PRICING_UNAVAILABLE",
      `Aucun pays seedé pour la zone ${zone} — impossible d'en dériver la devise. ` +
        "Exécuter le seed des référentiels (prisma/seed.mjs).",
    );
  }
  return country.currency;
}

/** Dernière ligne pricing valide à date pour (zone, clé de plan). */
async function findPricingIndex(zone: string, key: string) {
  const db = getDb();
  const now = new Date();
  return db.zoneIndex.findFirst({
    where: {
      family: PRICING_FAMILY,
      countryCode: zone,
      key,
      validFrom: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
    },
    orderBy: { validFrom: "desc" },
    select: { value: true, source: true },
  });
}

/**
 * Grille des 2 plans pour la zone du pays (fallback UEMOA). Pur lookup DB —
 * throw `MarketError` si le référentiel n'est pas seedé (l'UI affiche alors
 * l'absence honnêtement, aucun montant de secours en dur).
 */
export async function getPlanPricing(countryCode?: string | null): Promise<PlanPricing> {
  const zone = await resolvePricingZone(countryCode);
  const currency = await resolveZoneCurrency(zone);

  const byPlan = {} as Record<PlanKey, PlanQuote>;
  for (const plan of PLAN_KEYS) {
    const row = await findPricingIndex(zone, PLAN_PRICING_KEYS[plan]);
    if (!row) {
      throw new MarketError(
        "PRICING_UNAVAILABLE",
        `Aucune ligne ZoneIndex pricing « ${PLAN_PRICING_KEYS[plan]} » valide pour la zone ${zone}. ` +
          "Exécuter le seed des référentiels (prisma/seed.mjs).",
      );
    }
    byPlan[plan] = {
      plan,
      amount: Math.round(row.value),
      currency,
      zone,
      source: row.source,
      placeholder: isPlaceholderSource(row.source),
    };
  }

  const sources = [...new Set(PLAN_KEYS.map((p) => byPlan[p].source))];
  return {
    zone,
    currency,
    cockpitMonthly: byPlan.cockpit.amount,
    retainerQuarterly: byPlan.retainer.amount,
    source: sources.join(" · "),
    placeholder: PLAN_KEYS.some((p) => byPlan[p].placeholder),
    byPlan,
  };
}

/** Prix résolu d'un seul plan (même mécanique, même fallback de zone). */
export async function getPlanQuote(
  plan: PlanKey,
  countryCode?: string | null,
): Promise<PlanQuote> {
  const pricing = await getPlanPricing(countryCode);
  return pricing.byPlan[plan];
}
