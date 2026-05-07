"use client";

/**
 * `<MarketFilter>` — pill-style market selector for cockpit brand pages.
 *
 * Phase 18 (ADR-0059) UX iteration 2026-05-07. Until now the operator had to
 * switch Strategy in the global header dropdown to drill on a specific
 * country (FrieslandCampina – RDC vs – Sénégal). That made the dropdown
 * heavy and forced 1 Strategy per market. The proposed model :
 *
 *   1 Strategy per *brand* (e.g. Bonnet Rouge, FrieslandCampina umbrella)
 *   → market filtering happens *inside* each brand page via this component
 *
 * The component is **stateless** and **URL-driven** — the active market is
 * stored in `?market=CD` so deep-links and refreshes preserve context. The
 * parent page reads the value via `useMarket()` and applies it to its data
 * queries (filter pillar.content, signals, KPIs by countryCode).
 *
 *   <MarketFilter
 *     markets={[
 *       { code: "ALL", label: "Tous les marchés" },
 *       { code: "CD",  label: "RDC" },
 *       { code: "SN",  label: "Sénégal" },
 *       { code: "TG",  label: "Togo" },
 *     ]}
 *   />
 *   const market = useMarket();   // "ALL" | "CD" | …
 *
 * Manual-first parity (ADR-0060) : "Tous les marchés" reste l'état par défaut
 * non-destructif, le filter est un ajout opt-in.
 */

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Globe2, MapPin } from "lucide-react";

export interface MarketOption {
  /** ISO 3166-1 alpha-2 ou "ALL" pour la vue agrégée. */
  code: string;
  /** Libellé affiché dans le pill. */
  label: string;
  /** Optionnel : count à afficher en suffix (ex: "12 actions"). */
  count?: number;
}

export interface MarketFilterProps {
  markets: readonly MarketOption[];
  /** Param URL pour stocker la sélection. Défaut: "market". */
  paramName?: string;
  /** Code par défaut quand aucun n'est sélectionné. Défaut: premier de la liste. */
  defaultCode?: string;
  /** className wrapper. */
  className?: string;
}

export function MarketFilter({
  markets,
  paramName = "market",
  defaultCode,
  className = "",
}: MarketFilterProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const fallback = defaultCode ?? markets[0]?.code ?? "ALL";
  const active = searchParams.get(paramName) ?? fallback;

  function setMarket(code: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (code === fallback) params.delete(paramName);
    else params.set(paramName, code);
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  if (markets.length <= 1) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`} role="tablist" aria-label="Filtrer par marché">
      {markets.map((m) => {
        const isActive = m.code === active;
        const isAggregate = m.code === "ALL" || m.code === "GLOBAL";
        return (
          <button
            key={m.code}
            role="tab"
            aria-selected={isActive}
            onClick={() => setMarket(m.code)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              isActive
                ? "border-accent bg-accent/15 text-accent"
                : "border-border bg-transparent text-foreground-muted hover:border-border-strong hover:text-foreground-secondary"
            }`}
          >
            {isAggregate ? <Globe2 className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
            <span>{m.label}</span>
            {m.count !== undefined && (
              <span className={`ml-0.5 rounded px-1 text-[9px] ${
                isActive ? "bg-accent/20" : "bg-foreground-muted/10"
              }`}>
                {m.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Hook companion qui retourne le market actif. À utiliser dans les pages
 * pour filtrer les data côté query ou côté client-side filter.
 *
 *   const market = useMarket();
 *   const filteredSignals = useMemo(
 *     () => market === "ALL" ? signals : signals.filter(s => s.countryCode === market),
 *     [signals, market],
 *   );
 */
export function useMarket(paramName = "market", fallback = "ALL"): string {
  const searchParams = useSearchParams();
  return searchParams.get(paramName) ?? fallback;
}
