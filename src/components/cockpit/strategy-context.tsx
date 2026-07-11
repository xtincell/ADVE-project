"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { trpc } from "@/lib/trpc/client";

interface StrategyOption {
  id: string;
  name: string;
  status: string;
  /** Phase 18 ADR-0059 — BrandNode parent (CORPORATE / MASTER_BRAND) si la
   *  Strategy est rattachée à un nœud de l'arbre marque. null = standalone. */
  brandNode: {
    nodeKind: string;
    countryCode: string | null;
    parent: { id: string; name: string; nodeKind: string; slug: string } | null;
  } | null;
}

interface StrategyContextValue {
  strategyId: string | null;
  strategies: StrategyOption[];
  isLoading: boolean;
  setStrategyId: (id: string) => void;
}

const StrategyContext = createContext<StrategyContextValue>({
  strategyId: null,
  strategies: [],
  isLoading: true,
  setStrategyId: () => {},
});

/** Persistance de la marque active (lot 10, audit 2026-07-11 [M01-06]) —
 *  même pattern que `lf-sidebar-collapsed` : un reload/nouvel onglet ne
 *  retombe plus silencieusement sur la première marque. */
const ACTIVE_STRATEGY_STORAGE_KEY = "lf-active-strategy";

export function StrategyProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = trpc.strategy.list.useQuery({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Deep-link Console → Cockpit : `?strategy=<id>` sélectionne la marque cible
  // (prioritaire sur la sélection persistée). La Console adresse les marques
  // par id ; sans ça le Cockpit retombait sur la 1re marque (branchement
  // cassé). Lu côté client (pas `useSearchParams` → évite le bail-out
  // CSR/Suspense au prerender) au montage du Cockpit.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("strategy");
    if (fromUrl) {
      setSelectedId(fromUrl);
      localStorage.setItem(ACTIVE_STRATEGY_STORAGE_KEY, fromUrl);
      return;
    }
    const stored = localStorage.getItem(ACTIVE_STRATEGY_STORAGE_KEY);
    if (stored) setSelectedId(stored);
  }, []);

  const strategies: StrategyOption[] = (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    brandNode: (s as { brandNode?: StrategyOption["brandNode"] }).brandNode ?? null,
  }));

  // Use selected (deep-link ?strategy= > sélection persistée), else fall back
  // to first. Une sélection persistée qui ne résout plus (marque supprimée /
  // autre compte) est ignorée par le fallback — pas d'état cassé.
  // QUICK_INTAKE exclus du fallback : un lead non converti (résolu côté
  // Console) ne doit jamais devenir la marque active par défaut du Cockpit.
  const activeStrategies = strategies.filter(
    (s) => s.status !== "DELETED" && s.status !== "ARCHIVED" && s.status !== "QUICK_INTAKE",
  );
  const selectedStillExists = selectedId != null && activeStrategies.some((s) => s.id === selectedId);
  const strategyId = (selectedStillExists ? selectedId : null) ?? activeStrategies[0]?.id ?? strategies[0]?.id ?? null;

  const setStrategyId = useCallback((id: string) => {
    setSelectedId(id);
    localStorage.setItem(ACTIVE_STRATEGY_STORAGE_KEY, id);
  }, []);

  return (
    <StrategyContext.Provider value={{ strategyId, strategies, isLoading, setStrategyId }}>
      {children}
    </StrategyContext.Provider>
  );
}

export function useStrategy() {
  return useContext(StrategyContext);
}

/** Drop-in replacement for the old useCurrentStrategyId() */
export function useCurrentStrategyId() {
  const { strategyId } = useStrategy();
  return strategyId;
}

/** Strategy switcher with "Nouvelle marque" button */
export function StrategySwitcher() {
  const { strategyId, strategies, setStrategyId } = useStrategy();

  return (
    <div className="flex items-center gap-2">
      {strategies.length > 1 && (
        <select
          value={strategyId ?? ""}
          onChange={(e) => setStrategyId(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-white outline-none focus:border-accent"
        >
          {strategies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}
      {strategies.length === 1 && (
        <span className="text-sm font-medium text-white">{strategies[0]!.name}</span>
      )}
      <a
        href="/cockpit/new"
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-border-strong px-3 py-1.5 text-xs text-foreground-secondary hover:border-accent hover:text-accent transition-colors"
      >
        <span className="text-lg leading-none">+</span>
        Nouvelle marque
      </a>
    </div>
  );
}
