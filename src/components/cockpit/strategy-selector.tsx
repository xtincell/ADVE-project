"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Building2, Check, Plus, MapPin } from "lucide-react";
import { useStrategy } from "./strategy-context";
import Link from "next/link";

/**
 * Phase 18 (ADR-0059) — Strategy selector with hierarchical grouping.
 *
 * Strategies linked to a BrandNode under a CORPORATE/MASTER_BRAND parent are
 * grouped under that parent's name with indent + country flag. Standalone
 * strategies (no BrandNode link) are listed in a separate section. The flat
 * dropdown was hiding the brand-tree relationship that already exists in DB.
 *
 *   FrieslandCampina (corporate)
 *   ├─ FrieslandCampina – RDC      (CD)
 *   ├─ FrieslandCampina – Sénégal  (SN)
 *   └─ FrieslandCampina – Togo     (TG)
 *
 *   Standalone
 *   • CIMENCAM
 *   • BLISS by Wakanda
 */
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

  // Group by BrandNode parent. Strategies that are themselves CORPORATE
  // (parent = null) sit at the top of their own group. Strategies under a
  // parent BrandNode are nested. Strategies with no BrandNode link land in
  // "Standalone".
  const grouped = useMemo(() => {
    type Group = {
      key: string;
      label: string;
      kind: "CORPORATE" | "STANDALONE";
      corporateStrategy: typeof strategies[number] | null;
      children: typeof strategies;
    };
    const byParent = new Map<string, Group>();
    const standalone: typeof strategies = [];
    const corporateOnly: typeof strategies = []; // Strategy directly = CORPORATE node, no parent

    for (const s of strategies) {
      const node = s.brandNode;
      if (!node) {
        standalone.push(s);
        continue;
      }
      if (node.parent) {
        const key = node.parent.id;
        const existing = byParent.get(key);
        if (existing) {
          existing.children.push(s);
        } else {
          byParent.set(key, {
            key,
            label: node.parent.name,
            kind: "CORPORATE",
            corporateStrategy: null,
            children: [s],
          });
        }
      } else {
        // BrandNode without parent = root (CORPORATE itself with a strategy).
        // Match it to its group by name later if children exist.
        corporateOnly.push(s);
      }
    }

    // Attach corporateOnly strategies to their group if the group exists,
    // otherwise let them be their own root.
    for (const s of corporateOnly) {
      const matching = [...byParent.values()].find((g) => g.label === s.name);
      if (matching) {
        matching.corporateStrategy = s;
      } else {
        byParent.set(`solo-${s.id}`, {
          key: `solo-${s.id}`,
          label: s.name,
          kind: "CORPORATE",
          corporateStrategy: s,
          children: [],
        });
      }
    }

    const groups = [...byParent.values()].sort((a, b) => a.label.localeCompare(b.label));
    return { groups, standalone: standalone.sort((a, b) => a.name.localeCompare(b.name)) };
  }, [strategies]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm">
        <Building2 className="h-3.5 w-3.5 text-foreground-muted animate-pulse" />
        <span className="text-foreground-muted">Chargement...</span>
      </div>
    );
  }

  const current = strategies.find((s) => s.id === strategyId);

  return (
    <div className="relative" ref={containerRef} style={{ zIndex: 60 }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm transition-colors hover:border-border hover:bg-background/80"
      >
        <Building2 className="h-3.5 w-3.5 text-accent" />
        <span className="max-w-[200px] truncate font-medium text-white">
          {current?.name ?? "Selectionner une marque"}
        </span>
        <ChevronDown className={`h-3 w-3 text-foreground-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[70] mt-1 w-80 overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
          <div className="p-1.5">
            <p className="mb-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
              Vos marques ({strategies.length})
            </p>

            <div className="max-h-96 overflow-y-auto">
              {strategies.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-foreground-muted">Aucune marque</p>
              ) : (
                <>
                  {grouped.groups.map((g) => (
                    <div key={g.key} className="mb-1.5">
                      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                        <Building2 className="h-3 w-3 text-accent/70" />
                        <span className="truncate">{g.label}</span>
                      </div>
                      {g.corporateStrategy && (
                        <StrategyRow
                          strategy={g.corporateStrategy}
                          isActive={g.corporateStrategy.id === strategyId}
                          indent={false}
                          onSelect={(id) => { setStrategyId(id); setOpen(false); }}
                        />
                      )}
                      {g.children.map((s) => (
                        <StrategyRow
                          key={s.id}
                          strategy={s}
                          isActive={s.id === strategyId}
                          indent
                          onSelect={(id) => { setStrategyId(id); setOpen(false); }}
                        />
                      ))}
                    </div>
                  ))}
                  {grouped.standalone.length > 0 && (
                    <div className="mt-1">
                      {grouped.groups.length > 0 && (
                        <div className="mx-2 my-1 border-t border-border/50" />
                      )}
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                        Marques solo
                      </div>
                      {grouped.standalone.map((s) => (
                        <StrategyRow
                          key={s.id}
                          strategy={s}
                          isActive={s.id === strategyId}
                          indent={false}
                          onSelect={(id) => { setStrategyId(id); setOpen(false); }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="border-t border-border p-1.5">
            <Link
              href="/cockpit/portfolio"
              onClick={() => setOpen(false)}
              className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-foreground-secondary transition-colors hover:bg-background hover:text-white"
            >
              <Building2 className="h-3.5 w-3.5" />
              Voir l&apos;arbre portfolio complet
            </Link>
            <Link
              href="/cockpit/new"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground-secondary transition-colors hover:bg-background hover:text-white"
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

interface StrategyRowProps {
  strategy: { id: string; name: string; status: string; brandNode: { nodeKind: string; countryCode: string | null } | null };
  isActive: boolean;
  indent: boolean;
  onSelect: (id: string) => void;
}

function StrategyRow({ strategy, isActive, indent, onSelect }: StrategyRowProps) {
  return (
    <button
      onClick={() => onSelect(strategy.id)}
      className={`flex w-full items-center gap-2 rounded-md py-2 text-left transition-colors ${
        indent ? "pl-7 pr-3" : "px-3"
      } ${
        isActive ? "bg-accent/10 text-white" : "text-foreground-secondary hover:bg-background hover:text-white"
      }`}
    >
      {indent ? (
        <span className="-ml-3 mr-1 text-foreground-muted/40 text-xs">└</span>
      ) : (
        <Building2 className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? "text-accent" : "text-foreground-muted"}`} />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{strategy.name}</p>
        {strategy.status && strategy.status !== "ACTIVE" && (
          <p className="text-[10px] text-foreground-muted">{strategy.status}</p>
        )}
      </div>
      {strategy.brandNode?.countryCode && (
        <span className="inline-flex items-center gap-0.5 rounded bg-foreground-muted/10 px-1.5 py-0.5 text-[10px] font-mono text-foreground-muted">
          <MapPin className="h-2.5 w-2.5" />
          {strategy.brandNode.countryCode}
        </span>
      )}
      {isActive && <Check className="h-3.5 w-3.5 flex-shrink-0 text-accent" />}
    </button>
  );
}
