"use client";

/**
 * `<BrandMarketCommutator>` — tabs en haut des pages brand.
 *
 * Phase 18 (ADR-0059) — round 4 / 2026-05-07. Pivot UX décidé après
 * itérations sélecteur :
 *
 *   1 Strategy = 1 *marque* (l'ADN, l'identity, l'ADVE)
 *   1 marque = N marchés (regional brands enfants)
 *   → on commute entre vue globale et vue marché *à l'intérieur* de la page
 *
 * Le commutator rend tabs au top de la page brand :
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Bonnet Rouge                                                 │
 *   │ ─────────────────────────────────────────────────────────── │
 *   │ [Vue globale]  [CI]  [CM]  [SN]  [TG]                        │
 *   └──────────────────────────────────────────────────────────────┘
 *
 *   - Vue globale : pillars MASTER_BRAND brut, l'ADN imprimable
 *   - Vue marché   : `resolveEffectivePillars(regionalNodeId)` qui hérite
 *     du parent + applique `pillarOverrides` locaux (langue, Overton
 *     ajusté, maturité spécifique)
 *
 * État stocké en URL `?market=<slug|ALL>` — deep-linkable, refresh-safe.
 *
 * Manual-first parity (ADR-0060) : "Vue globale" est l'état par défaut, le
 * commutator est une lecture explicite du marché par l'opérateur.
 */

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Globe2, MapPin } from "lucide-react";

export interface BrandMarketCommutatorProps {
  /** BrandNode du brand parent (CORPORATE ou MASTER_BRAND). */
  brandNodeId: string;
  /** Param URL où stocker la vue active. Défaut : "market". */
  paramName?: string;
  /** Mode compact (pour pages denses). */
  compact?: boolean;
  className?: string;
}

export function BrandMarketCommutator({
  brandNodeId,
  paramName = "market",
  compact = false,
  className = "",
}: BrandMarketCommutatorProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading } = trpc.brandNode.listMarketsForBrand.useQuery({ brandNodeId });

  const active = searchParams.get(paramName) ?? "ALL";

  function setMarket(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") params.delete(paramName);
    else params.set(paramName, value);
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  if (isLoading || !data) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-3 py-1 text-xs text-foreground-muted">
          <Globe2 className="h-3 w-3 animate-pulse" />
          Chargement marchés…
        </span>
      </div>
    );
  }

  // Aucun marché enfant → on n'affiche pas le commutator (la page reste en vue globale implicite).
  if (data.markets.length === 0) return null;

  const padding = compact ? "px-2 py-0.5 text-2xs" : "px-3 py-1 text-xs";

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`} role="tablist" aria-label="Vue par marché">
      <button
        role="tab"
        aria-selected={active === "ALL"}
        onClick={() => setMarket("ALL")}
        className={`inline-flex items-center gap-1 rounded-full border font-medium transition-colors ${padding} ${
          active === "ALL"
            ? "border-accent bg-accent/15 text-accent"
            : "border-border bg-transparent text-foreground-muted hover:border-border-strong hover:text-foreground-secondary"
        }`}
        title="Vue globale — l'ADN de la marque, hérité par tous les marchés"
      >
        <Globe2 className="h-3 w-3" />
        Vue globale
      </button>
      {data.markets.map((m) => {
        const slug = m.slug ?? m.id;
        const isActive = active === slug;
        return (
          <button
            key={m.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => setMarket(slug)}
            className={`inline-flex items-center gap-1 rounded-full border font-medium transition-colors ${padding} ${
              isActive
                ? "border-accent bg-accent/15 text-accent"
                : "border-border bg-transparent text-foreground-muted hover:border-border-strong hover:text-foreground-secondary"
            }`}
            title={m.strategy ? `Vue ${m.name} — pillars hérités + overrides locaux` : `${m.name} — pas encore configuré`}
          >
            <MapPin className="h-3 w-3" />
            <span>{m.countryCode ?? m.name}</span>
            {!m.strategy && (
              <span className="ml-0.5 rounded bg-foreground-muted/20 px-1 text-[9px] uppercase tracking-wider text-foreground-muted">
                vide
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Hook companion. Retourne le marché actif (ALL = vue globale, sinon slug
 * du regional brand). À combiner avec `brandNode.resolveEffectivePillars`
 * pour récupérer les pillars effectifs (héritage + overrides locaux).
 *
 *   const market = useActiveMarket();
 *   const targetNodeId = market === "ALL"
 *     ? globalBrandNodeId
 *     : marketsBySlug.get(market)?.id ?? globalBrandNodeId;
 *   const pillars = trpc.brandNode.resolveEffectivePillars.useQuery({ nodeId: targetNodeId });
 */
export function useActiveMarket(paramName = "market"): string {
  const searchParams = useSearchParams();
  return searchParams.get(paramName) ?? "ALL";
}
