"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { trpc } from "@/lib/trpc/client";

interface StrategyOption {
  id: string;
  name: string;
  status: string;
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

export function StrategyProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = trpc.strategy.list.useQuery({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const strategies: StrategyOption[] = (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
  }));

  // Use selected or fall back to first strategy (show all, not just ACTIVE)
  const activeStrategies = strategies.filter((s) => s.status !== "DELETED" && s.status !== "ARCHIVED");
  const strategyId = selectedId ?? activeStrategies[0]?.id ?? strategies[0]?.id ?? null;

  const setStrategyId = useCallback((id: string) => {
    setSelectedId(id);
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
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white outline-none focus:border-violet-500"
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
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-600 px-3 py-1.5 text-xs text-zinc-400 hover:border-violet-500 hover:text-violet-300 transition-colors"
      >
        <span className="text-lg leading-none">+</span>
        Nouvelle marque
      </a>
    </div>
  );
}
