"use client";

/**
 * <PricingTiers /> — Neteru UI Kit (Operations sub-system).
 *
 * Renders the funnel tier grid driven by the `monetization` service.
 * Customer-facing, market-localized. The "standard market" is never
 * named in the UI.
 *
 * Mission contribution: GROUND_INFRASTRUCTURE — the conversion lever
 * that turns free intake into retainer. Without this component the
 * funnel has no front-end.
 */

import { useMemo, useState } from "react";
import { Check, ArrowRight, Loader2, Sparkles } from "lucide-react";

interface ResolvedPrice {
  tier: string;
  tierLabel: string;
  amount: number;
  currencyCode: string;
  currencySymbol: string;
  billing: "ONE_TIME" | "MONTHLY";
  display: string;
  localizedBadge?: string;
}

interface TierDef {
  key: string;
  label: string;
  summary: string;
  inclusions: readonly string[];
  billing: "ONE_TIME" | "MONTHLY";
  unlocksMissionStep: 1 | 2 | 3 | 4 | 5;
}

interface TierWithPrice {
  definition: TierDef;
  price: ResolvedPrice;
}

interface PricingTiersProps {
  tiers: readonly TierWithPrice[];
  /** Tier currently active (already paid) — visually distinguished. */
  currentTier?: string;
  /** Recommended tier (highlighted). Defaults to the middle tier. */
  recommendedTier?: string;
  /** Loading state per-tier (set when init payment is in progress). */
  loadingTier?: string;
  /** Called when user clicks the CTA on a tier. */
  onSelectTier?: (tierKey: string) => void;
  /** Optional headline above the grid. */
  headline?: string;
  /** Compact mode: single column on mobile, denser cards. */
  compact?: boolean;
}

const STEP_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Substance",
  2: "Engagement",
  3: "Accumulation",
  4: "Gravité",
  5: "Overton shift",
};

export function PricingTiers({
  tiers,
  currentTier,
  recommendedTier,
  loadingTier,
  onSelectTier,
  headline,
  compact = false,
}: PricingTiersProps) {
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);

  const recommended = useMemo(() => {
    if (recommendedTier) return recommendedTier;
    if (tiers.length === 0) return null;
    // Pick the middle tier by default (Oracle Full typically)
    return tiers[Math.floor(tiers.length / 2)]?.definition.key ?? null;
  }, [recommendedTier, tiers]);

  return (
    <section className="space-y-4">
      {headline && (
        <div className="text-center">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-100">{headline}</h2>
        </div>
      )}

      <div
        className={
          "grid gap-4 " +
          (compact
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-" + Math.min(tiers.length, 5))
        }
      >
        {tiers.map(({ definition, price }) => {
          const isRecommended = definition.key === recommended;
          const isCurrent = definition.key === currentTier;
          const isLoading = definition.key === loadingTier;
          const isHovered = definition.key === hoveredTier;
          const billingLabel = price.billing === "MONTHLY" ? "/ mois" : "";

          return (
            <article
              key={definition.key}
              onMouseEnter={() => setHoveredTier(definition.key)}
              onMouseLeave={() => setHoveredTier(null)}
              className={[
                "relative flex flex-col rounded-2xl border bg-gradient-to-b p-5 transition-all",
                isRecommended
                  ? "border-amber-700/60 from-amber-950/30 to-zinc-950 shadow-lg shadow-amber-900/20"
                  : "border-zinc-800 from-zinc-950 to-zinc-900/60",
                isHovered && !isRecommended ? "border-zinc-700" : "",
                isCurrent ? "ring-2 ring-emerald-700/60" : "",
              ].join(" ")}
            >
              {isRecommended && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                  Recommandé
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-2.5 right-3 rounded-full bg-emerald-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Activé
                </div>
              )}

              <header>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  {STEP_LABELS[definition.unlocksMissionStep]}
                </div>
                <h3 className="text-lg font-semibold text-zinc-100">{definition.label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{definition.summary}</p>
              </header>

              {/* Price row + localized badge.
                  Landscape with 5 columns gives each card a ~180-220px width.
                  The 3xl price + "/ mois" + "PRIX LOCAL" cannot fit on one
                  line at that width, and the previous flex layout (no wrap)
                  caused the badge to bleed outside the card. We split into
                  two rows: price+billing on one line, badge on its own. */}
              <div className="my-4 space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                  <span
                    className={
                      "text-2xl font-bold leading-tight sm:text-3xl " +
                      (isRecommended ? "text-amber-400" : "text-zinc-100")
                    }
                  >
                    {price.amount === 0 ? "Gratuit" : price.display}
                  </span>
                  {price.amount > 0 && billingLabel && (
                    <span className="text-xs text-zinc-500">{billingLabel}</span>
                  )}
                </div>
                {price.localizedBadge && (
                  <span className="inline-flex max-w-full items-center rounded-full border border-emerald-900/60 bg-emerald-950/30 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                    {price.localizedBadge}
                  </span>
                )}
              </div>

              <ul className="flex-1 space-y-1.5 text-xs text-zinc-300">
                {definition.inclusions.map((inc, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check
                      className={"mt-0.5 h-3.5 w-3.5 flex-shrink-0 " + (isRecommended ? "text-amber-500" : "text-zinc-500")}
                    />
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={isLoading || isCurrent}
                onClick={() => onSelectTier?.(definition.key)}
                className={[
                  "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50",
                  isRecommended
                    ? "bg-amber-600 text-black hover:bg-amber-500"
                    : isCurrent
                      ? "bg-emerald-900/40 text-emerald-200"
                      : "border border-zinc-800 bg-zinc-900 text-zinc-100 hover:border-zinc-700 hover:bg-zinc-800",
                ].join(" ")}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Initialisation…</span>
                  </>
                ) : isCurrent ? (
                  <span>Tier activé</span>
                ) : price.amount === 0 ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Commencer</span>
                  </>
                ) : (
                  <>
                    <span>Choisir ce tier</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-zinc-600">
        Prix adaptés à votre marché. TVA incluse. Paiement sécurisé Stripe / CinetPay (Mobile Money).
      </p>
    </section>
  );
}
