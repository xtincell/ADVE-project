"use client";

import { useState } from "react";
import { ChevronDown, Building2, Check } from "lucide-react";
import { useStrategy } from "./strategy-context";

export function StrategySelector() {
  const { strategyId, strategies, isLoading, setStrategyId } = useStrategy();
  const [open, setOpen] = useState(false);

  if (isLoading || strategies.length <= 1) return null;

  const current = strategies.find((s) => s.id === strategyId);

  return (
    <div className="relative" data-strategy-selector>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm transition-colors hover:border-zinc-700"
      >
        <Building2 className="h-3.5 w-3.5 text-violet-400" />
        <span className="font-medium text-white">{current?.name ?? "Selectionner"}</span>
        <ChevronDown className={`h-3 w-3 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 shadow-xl">
            <p className="mb-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
              Marques
            </p>
            {strategies.map((s) => {
              const isActive = s.id === strategyId;
              const isQuickIntake = s.status === "QUICK_INTAKE";
              return (
                <button
                  key={s.id}
                  onClick={() => { setStrategyId(s.id); setOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                    isActive ? "bg-violet-500/10 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <Building2 className={`h-4 w-4 ${isActive ? "text-violet-400" : "text-zinc-600"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    {isQuickIntake && (
                      <p className="text-[10px] text-zinc-600">Quick Intake</p>
                    )}
                  </div>
                  {isActive && <Check className="h-3.5 w-3.5 text-violet-400" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
