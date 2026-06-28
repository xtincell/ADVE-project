/**
 * media-metrics.ts — Moteur de KPI média **déterministe** (ATL/BTL/TTL).
 *
 * Doctrine « rien codé en dur, base de données, zéro LLM » : ce module ne contient
 * que les **formules canoniques** de la planification média. Aucune **valeur
 * métier** (CPM, GRP cible, fréquence efficace, coefficient ESOV→croissance) n'est
 * codée ici — ces chiffres sont **time/market-varying** et vivent en table de
 * référence datée + sourcée (cf. `MediaBenchmark`/`MarketCostSnapshot`, ADR-0099).
 * Les fonctions reçoivent ces valeurs en paramètre. Pur, déterministe, testable
 * sans I/O ni mock.
 *
 * Formules sourcées (audit marché 2026) :
 *  - GRP = Reach% × Fréquence moyenne · GRP = Impressions ÷ Population × 100
 *    (Wikipedia Gross rating point).
 *  - CPM = Coût ÷ Impressions × 1000 (Adjust/Amazon Ads).
 *  - CPP = Coût ÷ GRP (True Impact Media).
 *  - CTR = Clics ÷ Impressions ; CPC = Coût ÷ Clics (Google Ads / Adjust).
 *  - VCR = Vues complètes ÷ Vues démarrées ; VTR = Vues comptées ÷ Impressions
 *    (dénominateurs distincts — ne pas confondre).
 *  - CPA = Coût ÷ Acquisitions ; ROAS = Revenu ÷ Dépense.
 *  - SOV = Dépense marque ÷ Dépense catégorie ; ESOV = SOV − SOM ;
 *    croissance ≈ (ESOV/10) × coefPerTenPoints (Binet&Field, coef ~0,5-0,7 sourcé
 *    → fourni par l'appelant depuis la base, jamais en dur).
 */

/** Division sûre — `null` si dénominateur nul/invalide (jamais de NaN/Infinity). */
function safeDiv(num: number, den: number): number | null {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  const r = num / den;
  return Number.isFinite(r) ? r : null;
}

// ── Reach / Frequency / GRP ─────────────────────────────────────────────────

/** GRP = Reach (%) × Fréquence moyenne. */
export function grp(reachPct: number, avgFrequency: number): number | null {
  if (!Number.isFinite(reachPct) || !Number.isFinite(avgFrequency)) return null;
  return reachPct * avgFrequency;
}

/** GRP = Impressions ÷ Population × 100 (1 GRP = 1 % de la cible exposée 1×). */
export function grpFromImpressions(impressions: number, population: number): number | null {
  const r = safeDiv(impressions, population);
  return r == null ? null : r * 100;
}

/** Fréquence moyenne = GRP ÷ Reach% (équiv. Expositions totales ÷ Reach). */
export function avgFrequency(grpValue: number, reachPct: number): number | null {
  return safeDiv(grpValue, reachPct);
}

/** Reach% = GRP ÷ Fréquence moyenne. */
export function reachFromGrp(grpValue: number, avgFrequencyValue: number): number | null {
  return safeDiv(grpValue, avgFrequencyValue);
}

/**
 * Reach efficace : part de cible atteinte à une fréquence ≥ fréquence efficace.
 * `effectiveFrequencyTarget` est un **paramètre** (3+ pour un lancement, 1 en
 * récence — chiffre de référence fourni depuis la base, pas codé ici).
 */
export function isAboveEffectiveFrequency(avgFrequencyValue: number, effectiveFrequencyTarget: number): boolean {
  return Number.isFinite(avgFrequencyValue) && Number.isFinite(effectiveFrequencyTarget)
    && avgFrequencyValue >= effectiveFrequencyTarget;
}

// ── Coûts média ─────────────────────────────────────────────────────────────

/** CPM = Coût ÷ Impressions × 1000. */
export function cpm(cost: number, impressions: number): number | null {
  const r = safeDiv(cost, impressions);
  return r == null ? null : r * 1000;
}

/** CPP (cost per point) = Coût ÷ GRP. */
export function cpp(cost: number, grpValue: number): number | null {
  return safeDiv(cost, grpValue);
}

/** CPC = Coût ÷ Clics. */
export function cpc(cost: number, clicks: number): number | null {
  return safeDiv(cost, clicks);
}

/** CPA = Coût ÷ Acquisitions. */
export function cpa(cost: number, acquisitions: number): number | null {
  return safeDiv(cost, acquisitions);
}

// ── Taux d'engagement / complétion ──────────────────────────────────────────

/** CTR = Clics ÷ Impressions (ratio 0..1 ; ×100 pour %). */
export function ctr(clicks: number, impressions: number): number | null {
  return safeDiv(clicks, impressions);
}

/** VCR = Vues complètes ÷ Vues démarrées (dénominateur = vues démarrées). */
export function vcr(completedViews: number, startedViews: number): number | null {
  return safeDiv(completedViews, startedViews);
}

/** VTR = Vues comptées ÷ Impressions (dénominateur = impressions — distinct du VCR). */
export function vtr(countedViews: number, impressions: number): number | null {
  return safeDiv(countedViews, impressions);
}

// ── Retour / part de voix ───────────────────────────────────────────────────

/** ROAS = Revenu ÷ Dépense (3 = 3 $ générés par 1 $ dépensé). */
export function roas(revenue: number, adSpend: number): number | null {
  return safeDiv(revenue, adSpend);
}

/** SOV = Dépense (ou GRP) marque ÷ total catégorie (ratio 0..1). */
export function shareOfVoice(brandSpend: number, categorySpend: number): number | null {
  return safeDiv(brandSpend, categorySpend);
}

/** ESOV (Excess Share Of Voice, en points) = SOV(%) − SOM(%). */
export function esov(sovPct: number, somPct: number): number | null {
  if (!Number.isFinite(sovPct) || !Number.isFinite(somPct)) return null;
  return sovPct - somPct;
}

/**
 * Estimation de croissance de part de marché annuelle (points) à partir de l'ESOV.
 * `growthPerTenPoints` = coefficient sourcé (Binet&Field/Nielsen ~0,5-0,7) **fourni
 * par l'appelant depuis la base de référence**, jamais codé en dur ici.
 */
export function esovMarketShareGrowth(esovPoints: number, growthPerTenPoints: number): number | null {
  if (!Number.isFinite(esovPoints) || !Number.isFinite(growthPerTenPoints)) return null;
  return (esovPoints / 10) * growthPerTenPoints;
}

// ── BTL / activation ────────────────────────────────────────────────────────

/** Taux de conversion sampling = Conversions ÷ Échantillons distribués. */
export function samplingConversionRate(conversions: number, samples: number): number | null {
  return safeDiv(conversions, samples);
}

/** Coût par échantillon = Dépense sampling ÷ Échantillons distribués. */
export function costPerSample(totalSamplingSpend: number, samples: number): number | null {
  return safeDiv(totalSamplingSpend, samples);
}

/** Taux de rédemption = Coupons rédimés ÷ Coupons distribués. */
export function redemptionRate(redeemed: number, distributed: number): number | null {
  return safeDiv(redeemed, distributed);
}

// ── PCA — écart prévu vs réalisé ────────────────────────────────────────────

/** Écart relatif réalisé vs prévu (PCA / post-buy). `null` si prévu nul. */
export function deliveryVariancePct(planned: number, actual: number): number | null {
  const r = safeDiv(actual - planned, planned);
  return r == null ? null : r * 100;
}

/**
 * Sous-livraison déclenchant un **makegood** : prévu − réalisé si réalisé < prévu,
 * sinon 0. (Le seuil de tolérance d'écart — ~5-10 % — est une donnée de référence
 * fournie par l'appelant, pas codée ici.)
 */
export function makegoodShortfall(plannedImpressions: number, actualImpressions: number): number {
  if (!Number.isFinite(plannedImpressions) || !Number.isFinite(actualImpressions)) return 0;
  return Math.max(0, plannedImpressions - actualImpressions);
}
