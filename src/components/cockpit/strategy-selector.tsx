"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Building2, Check, Plus } from "lucide-react";
import { useStrategy } from "./strategy-context";
import Link from "next/link";

export function StrategySelector() {
  const { strategyId, strategies, isLoading, setStrategyId } = useStrategy();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm">
        <Building2 className="h-3.5 w-3.5 text-zinc-600 animate-pulse" />
        <span className="text-zinc-500">Chargement...</span>
      </div>
    );
  }

  const current = strategies.find((s) => s.id === strategyId);

  return (
    <div className="relative" ref={containerRef} style={{ zIndex: 60 }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm transition-colors hover:border-zinc-700 hover:bg-zinc-800/80"
      >
        <Building2 className="h-3.5 w-3.5 text-violet-400" />
        <span className="max-w-[160px] truncate font-medium text-white">
          {current?.name ?? "Selectionner une marque"}
        </span>
        <ChevronDown className={`h-3 w-3 text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[70] mt-1 w-72 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl">
          <div className="p-1.5">
            <p className="mb-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
              Vos marques ({strategies.length})
            </p>

            <div className="max-h-64 overflow-y-auto">
              {strategies.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-zinc-500">Aucune marque</p>
              ) : (
                strategies.map((s) => {
                  const isActive = s.id === strategyId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setStrategyId(s.id); setOpen(false); }}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                        isActive ? "bg-violet-500/10 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      <Building2 className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-violet-400" : "text-zinc-600"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        {s.status && s.status !== "ACTIVE" && (
                          <p className="text-[10px] text-zinc-600">{s.status}</p>
                        )}
                      </div>
                      {isActive && <Check className="h-3.5 w-3.5 flex-shrink-0 text-violet-400" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-t border-zinc-800 p-1.5">
            <Link
              href="/cockpit/new"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <Plus className="h-4 w-4" />
              Nouvelle marque
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
