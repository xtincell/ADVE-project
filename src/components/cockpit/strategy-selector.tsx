"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Building2, Check, Search, X, Settings, Plus, Folder } from "lucide-react";
import { useStrategy } from "./strategy-context";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

/**
 * Phase 18 (ADR-0059) — Brand selector, command-palette format.
 *
 * v6.19.10 grouped Strategies by CORPORATE name match, v6.19.11 added the
 * full BrandNode tree with recursion + indentation. Operator feedback
 * 2026-05-07 : la hiérarchie indentée surcharge le dropdown, les enfants
 * "regional brand × market" sont redondants avec ce qui devrait être un
 * filter pays *à l'intérieur* des pages brand. Round 3 : retour à un format
 * **plat avec recherche typeahead + badges**, et création d'un composant
 * `<MarketFilter>` séparé pour le filtrage par marché côté page brand.
 *
 *   ┌────────────────────────────┐
 *   │ 🔍 Rechercher une marque…  │
 *   ├────────────────────────────┤
 *   │ 🏢 FrieslandCampina  CORP  │
 *   │ 🏢 BLISS by Wakanda  BRAND │
 *   │ 🏢 CIMENCAM         BRAND  │
 *   │ ⚙ Bonnet Rouge      MASTER │  ← Settings = pas encore piloté
 *   │ 🏢 FrieslandCampina – RDC  │  ← regional, badge pays
 *   │   FrieslandCampina · CD    │
 *   │ ...                        │
 *   └────────────────────────────┘
 *
 * Plus de récursion — flat list, ordre alphabétique, pays en badge sur le
 * regional brands seulement, parent name en sous-titre quand utile.
 */
export function StrategySelector() {
  const { strategyId, setStrategyId } = useStrategy();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: tree, isLoading } = trpc.strategy.brandTreeForSelector.useQuery(
    {},
    { staleTime: 30_000 },
  );

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Flatten the tree into a single list. Each entry knows its parent name
  // (for sub-label disambiguation) but no indentation.
  const allEntries = useMemo(() => {
    if (!tree) return [] as BrandEntry[];
    const nodesById = new Map(tree.nodes.map((n) => [n.id, n]));
    const entries: BrandEntry[] = [];

    for (const n of tree.nodes) {
      const parent = n.parentNodeId ? nodesById.get(n.parentNodeId) ?? null : null;
      entries.push({
        kind: "BRAND_NODE",
        id: n.id,
        name: n.name,
        slug: n.slug,
        nodeKind: n.nodeKind,
        countryCode: n.countryCode,
        parentName: parent?.name ?? null,
        strategy: n.strategy,
      });
    }
    for (const s of tree.standaloneStrategies) {
      entries.push({
        kind: "STANDALONE_STRATEGY",
        id: s.id,
        name: s.name,
        slug: null,
        nodeKind: "STANDALONE_BRAND",
        countryCode: null,
        parentName: null,
        strategy: { id: s.id, name: s.name, status: s.status },
      });
    }
    // Sort : pilotable first, then alphabetical
    entries.sort((a, b) => {
      const aPilotable = !!a.strategy ? 0 : 1;
      const bPilotable = !!b.strategy ? 0 : 1;
      if (aPilotable !== bPilotable) return aPilotable - bPilotable;
      return a.name.localeCompare(b.name);
    });
    return entries;
  }, [tree]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allEntries;
    const q = query.toLowerCase();
    return allEntries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.parentName?.toLowerCase().includes(q) ?? false) ||
        e.countryCode?.toLowerCase().includes(q),
    );
  }, [allEntries, query]);

  if (isLoading || !tree) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm">
        <Building2 className="h-3.5 w-3.5 text-foreground-muted animate-pulse" />
        <span className="text-foreground-muted">Chargement...</span>
      </div>
    );
  }

  const currentEntry = allEntries.find((e) => e.strategy?.id === strategyId);
  const totalPilotable = allEntries.filter((e) => e.strategy).length;

  return (
    <div className="relative" ref={containerRef} style={{ zIndex: 60 }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm transition-colors hover:border-border hover:bg-background/80"
      >
        <Building2 className="h-3.5 w-3.5 text-accent" />
        <span className="max-w-[220px] truncate font-medium text-white">
          {currentEntry?.name ?? "Selectionner une marque"}
        </span>
        <ChevronDown className={`h-3 w-3 text-foreground-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[70] mt-1 w-96 overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 flex-shrink-0 text-foreground-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une marque…"
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-foreground-muted"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-foreground-muted hover:text-foreground-secondary"
                aria-label="Effacer la recherche"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="hidden sm:inline-flex items-center gap-0.5 rounded bg-foreground-muted/10 px-1.5 py-0.5 text-[10px] font-mono text-foreground-muted">
              ⌘K
            </span>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto p-1.5">
            <p className="mb-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
              {query
                ? `${filtered.length} résultat${filtered.length > 1 ? "s" : ""}`
                : `Portfolio · ${totalPilotable} marque${totalPilotable > 1 ? "s" : ""} pilotable${totalPilotable > 1 ? "s" : ""}`}
            </p>

            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-foreground-muted">Aucune marque ne correspond.</p>
            ) : (
              filtered.map((e) => (
                <BrandEntryRow
                  key={`${e.kind}-${e.id}`}
                  entry={e}
                  isActive={e.strategy?.id === strategyId}
                  onSelectStrategy={(id) => { setStrategyId(id); setOpen(false); setQuery(""); }}
                  onCloseDropdown={() => { setOpen(false); setQuery(""); }}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-1.5">
            <Link
              href="/cockpit/portfolio"
              onClick={() => { setOpen(false); setQuery(""); }}
              className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-foreground-secondary transition-colors hover:bg-background hover:text-white"
            >
              <Folder className="h-3.5 w-3.5" />
              Voir l&apos;arbre portfolio complet
            </Link>
            <Link
              href="/cockpit/new"
              onClick={() => { setOpen(false); setQuery(""); }}
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

interface BrandEntry {
  kind: "BRAND_NODE" | "STANDALONE_STRATEGY";
  id: string;
  name: string;
  slug: string | null;
  nodeKind: string;
  countryCode: string | null;
  parentName: string | null;
  strategy: { id: string; name: string; status: string } | null;
}

const KIND_BADGES: Record<string, { label: string; className: string }> = {
  CORPORATE: { label: "Corporate", className: "bg-accent/15 text-accent" },
  MASTER_BRAND: { label: "Master", className: "bg-blue-500/15 text-blue-300" },
  REGIONAL_CLUSTER: { label: "Cluster", className: "bg-violet-500/15 text-violet-300" },
  REGIONAL_BRAND: { label: "Regional", className: "bg-emerald-500/15 text-emerald-300" },
  PRODUCT_LINE: { label: "Gamme", className: "bg-amber-500/15 text-amber-300" },
  PRODUCT_VARIANT: { label: "Variant", className: "bg-foreground-muted/15 text-foreground-muted" },
  SKU: { label: "SKU", className: "bg-foreground-muted/15 text-foreground-muted" },
  STANDALONE_BRAND: { label: "Solo", className: "bg-foreground-muted/15 text-foreground-muted" },
};

function BrandEntryRow({
  entry,
  isActive,
  onSelectStrategy,
  onCloseDropdown,
}: {
  entry: BrandEntry;
  isActive: boolean;
  onSelectStrategy: (id: string) => void;
  onCloseDropdown: () => void;
}) {
  const badge = KIND_BADGES[entry.nodeKind] ?? KIND_BADGES.STANDALONE_BRAND!;
  const hasStrategy = !!entry.strategy;

  const baseClass = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors";

  if (hasStrategy) {
    return (
      <button
        onClick={() => onSelectStrategy(entry.strategy!.id)}
        className={`${baseClass} ${
          isActive ? "bg-accent/10 text-white" : "text-foreground-secondary hover:bg-background hover:text-white"
        }`}
      >
        <Building2 className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? "text-accent" : "text-foreground-muted"}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{entry.name}</p>
          {entry.parentName && entry.parentName !== entry.name && (
            <p className="truncate text-[10px] text-foreground-muted">{entry.parentName}</p>
          )}
        </div>
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.className}`}>
          {badge.label}
        </span>
        {entry.countryCode && (
          <span className="rounded bg-foreground-muted/10 px-1.5 py-0.5 text-[10px] font-mono text-foreground-muted">
            {entry.countryCode}
          </span>
        )}
        {isActive && <Check className="h-3.5 w-3.5 flex-shrink-0 text-accent" />}
      </button>
    );
  }

  // No strategy → portfolio link to configure
  return (
    <Link
      href={entry.slug ? `/cockpit/portfolio/${entry.slug}` : "/cockpit/portfolio"}
      onClick={onCloseDropdown}
      className={`${baseClass} text-foreground-muted hover:bg-background hover:text-foreground-secondary`}
    >
      <Building2 className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.name}</p>
        <p className="truncate text-[10px] text-foreground-muted/70">
          {entry.parentName ? `${entry.parentName} · pas encore piloté` : "pas encore piloté"}
        </p>
      </div>
      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider opacity-60 ${badge.className}`}>
        {badge.label}
      </span>
      <Settings className="h-3 w-3 flex-shrink-0 text-foreground-muted/50" />
    </Link>
  );
}
