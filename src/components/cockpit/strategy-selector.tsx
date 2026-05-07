"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Building2, Check, Plus, MapPin, Settings, Folder } from "lucide-react";
import { useStrategy } from "./strategy-context";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

/**
 * Phase 18 (ADR-0059) — Brand-tree-aware StrategySelector.
 *
 * Renders the complete BrandNode tree of the operator (every CORPORATE /
 * MASTER_BRAND / REGIONAL_BRAND / etc.), plus every Strategy. Each tree
 * row is clickable :
 *   - if the BrandNode has a Strategy attached → activate that Strategy
 *     (= corporate / master / regional brand pilotage)
 *   - if the BrandNode has NO Strategy yet → link to /cockpit/portfolio/[slug]
 *     where operator can configure / create the Strategy
 *
 *   FrieslandCampina (CORPORATE — Strategy attachée)             ← cliquable, pilotable
 *   ├─ Bonnet Rouge (MASTER_BRAND, no strategy)         [Configurer]  ← link portfolio
 *   ├─ Belle Hollandaise (MASTER_BRAND, no strategy)    [Configurer]
 *   ├─ FrieslandCampina – RDC (REGIONAL_BRAND, Strategy)  [CD]   ← cliquable, pilotable
 *   ├─ FrieslandCampina – Sénégal (REGIONAL_BRAND)        [SN]
 *   └─ FrieslandCampina – Togo (REGIONAL_BRAND)           [TG]
 *
 *   Marques solo (Strategy sans BrandNode)
 *   • CIMENCAM
 *   • BLISS by Wakanda
 *   • ...
 */
export function StrategySelector() {
  const { strategyId, setStrategyId } = useStrategy();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: tree, isLoading } = trpc.strategy.brandTreeForSelector.useQuery(
    {},
    { staleTime: 30_000 },
  );

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

  // Build tree structure from flat node list using parentNodeId.
  const built = useMemo(() => {
    if (!tree) return null;
    const nodesById = new Map<string, BrandNode>(
      tree.nodes.map((n) => [n.id, { ...n, children: [] as BrandNode[] }]),
    );
    const roots: BrandNode[] = [];
    for (const n of nodesById.values()) {
      if (n.parentNodeId) {
        const parent = nodesById.get(n.parentNodeId);
        if (parent) parent.children.push(n);
        else roots.push(n);
      } else {
        roots.push(n);
      }
    }
    // Sort each level alphabetically.
    for (const n of nodesById.values()) {
      n.children.sort((a, b) => a.name.localeCompare(b.name));
    }
    roots.sort((a, b) => a.name.localeCompare(b.name));
    return { roots, standaloneStrategies: tree.standaloneStrategies };
  }, [tree]);

  if (isLoading || !tree || !built) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm">
        <Building2 className="h-3.5 w-3.5 text-foreground-muted animate-pulse" />
        <span className="text-foreground-muted">Chargement...</span>
      </div>
    );
  }

  // Resolve current label : look up the active Strategy in any node, or in standalone.
  const activeNode = built.roots
    .flatMap((r) => [r, ...r.children, ...r.children.flatMap((c) => "children" in c ? (c as { children: typeof r.children }).children : [])])
    .find((n) => n.strategy?.id === strategyId);
  const activeStandalone = built.standaloneStrategies.find((s) => s.id === strategyId);
  const currentLabel = activeNode?.name ?? activeStandalone?.name ?? "Selectionner une marque";

  const totalPilotable = tree.nodes.filter((n) => n.strategy).length + built.standaloneStrategies.length;

  return (
    <div className="relative" ref={containerRef} style={{ zIndex: 60 }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm transition-colors hover:border-border hover:bg-background/80"
      >
        <Building2 className="h-3.5 w-3.5 text-accent" />
        <span className="max-w-[220px] truncate font-medium text-white">{currentLabel}</span>
        <ChevronDown className={`h-3 w-3 text-foreground-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[70] mt-1 w-96 overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
          <div className="p-1.5">
            <p className="mb-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
              Portfolio · {totalPilotable} marque{totalPilotable > 1 ? "s" : ""} pilotable{totalPilotable > 1 ? "s" : ""}
            </p>

            <div className="max-h-[28rem] overflow-y-auto">
              {built.roots.length === 0 && built.standaloneStrategies.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-foreground-muted">Aucune marque</p>
              ) : (
                <>
                  {built.roots.map((root) => (
                    <BrandNodeRow
                      key={root.id}
                      node={root}
                      depth={0}
                      activeStrategyId={strategyId}
                      onSelectStrategy={(id) => { setStrategyId(id); setOpen(false); }}
                      onCloseDropdown={() => setOpen(false)}
                    />
                  ))}
                  {built.standaloneStrategies.length > 0 && (
                    <div className="mt-2">
                      <div className="mx-2 my-1 border-t border-border/50" />
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                        Marques solo (sans arbre)
                      </div>
                      {built.standaloneStrategies.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setStrategyId(s.id); setOpen(false); }}
                          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors ${
                            s.id === strategyId
                              ? "bg-accent/10 text-white"
                              : "text-foreground-secondary hover:bg-background hover:text-white"
                          }`}
                        >
                          <Building2 className={`h-3.5 w-3.5 flex-shrink-0 ${s.id === strategyId ? "text-accent" : "text-foreground-muted"}`} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
                          {s.id === strategyId && <Check className="h-3.5 w-3.5 flex-shrink-0 text-accent" />}
                        </button>
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
              <Folder className="h-3.5 w-3.5" />
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

interface BrandNode {
  id: string;
  name: string;
  slug: string;
  nodeKind: string;
  nodeNature: string;
  countryCode: string | null;
  parentNodeId: string | null;
  strategyId: string | null;
  strategy: { id: string; name: string; status: string } | null;
  children: BrandNode[];
}

const KIND_LABEL: Record<string, string> = {
  CORPORATE: "Corporate",
  MASTER_BRAND: "Master brand",
  REGIONAL_CLUSTER: "Cluster",
  REGIONAL_BRAND: "Regional",
  PRODUCT_LINE: "Gamme",
  PRODUCT_VARIANT: "Variant",
  SKU: "SKU",
  STANDALONE_BRAND: "Brand",
};

function BrandNodeRow({
  node,
  depth,
  activeStrategyId,
  onSelectStrategy,
  onCloseDropdown,
}: {
  node: BrandNode;
  depth: number;
  activeStrategyId: string | null;
  onSelectStrategy: (id: string) => void;
  onCloseDropdown: () => void;
}) {
  const hasStrategy = !!node.strategy;
  const isActive = hasStrategy && node.strategy!.id === activeStrategyId;
  const indentPx = depth * 16;

  // Header weight depends on level — CORPORATE roots are headings, deeper rows are softer.
  const isRoot = depth === 0;

  return (
    <>
      {hasStrategy ? (
        <button
          onClick={() => onSelectStrategy(node.strategy!.id)}
          className={`flex w-full items-center gap-2 rounded-md py-2 text-left transition-colors ${
            isActive
              ? "bg-accent/10 text-white"
              : "text-foreground-secondary hover:bg-background hover:text-white"
          }`}
          style={{ paddingLeft: `${12 + indentPx}px`, paddingRight: "12px" }}
        >
          {!isRoot && <span className="-ml-3 mr-1 text-foreground-muted/40 text-xs">└</span>}
          <Building2 className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? "text-accent" : isRoot ? "text-accent/70" : "text-foreground-muted"}`} />
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm ${isRoot ? "font-semibold" : "font-medium"}`}>{node.name}</p>
            <p className="text-[10px] text-foreground-muted">{KIND_LABEL[node.nodeKind] ?? node.nodeKind}</p>
          </div>
          {node.countryCode && (
            <span className="inline-flex items-center gap-0.5 rounded bg-foreground-muted/10 px-1.5 py-0.5 text-[10px] font-mono text-foreground-muted">
              <MapPin className="h-2.5 w-2.5" />
              {node.countryCode}
            </span>
          )}
          {isActive && <Check className="h-3.5 w-3.5 flex-shrink-0 text-accent" />}
        </button>
      ) : (
        // No Strategy attached — link to portfolio detail page so operator
        // can attach/create one. Visually weaker so user understands it's
        // a "to configure" entry, not a pilotable Strategy.
        <Link
          href={`/cockpit/portfolio/${node.slug}`}
          onClick={onCloseDropdown}
          className="flex w-full items-center gap-2 rounded-md py-2 text-left text-foreground-muted transition-colors hover:bg-background hover:text-foreground-secondary"
          style={{ paddingLeft: `${12 + indentPx}px`, paddingRight: "12px" }}
        >
          {!isRoot && <span className="-ml-3 mr-1 text-foreground-muted/40 text-xs">└</span>}
          <Building2 className={`h-3.5 w-3.5 flex-shrink-0 opacity-50 ${isRoot ? "text-accent/40" : ""}`} />
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm ${isRoot ? "font-semibold" : "font-medium"}`}>{node.name}</p>
            <p className="text-[10px] text-foreground-muted/70">
              {KIND_LABEL[node.nodeKind] ?? node.nodeKind} · pas encore piloté
            </p>
          </div>
          {node.countryCode && (
            <span className="inline-flex items-center gap-0.5 rounded bg-foreground-muted/5 px-1.5 py-0.5 text-[10px] font-mono text-foreground-muted/70">
              <MapPin className="h-2.5 w-2.5" />
              {node.countryCode}
            </span>
          )}
          <Settings className="h-3 w-3 flex-shrink-0 text-foreground-muted/50" />
        </Link>
      )}
      {node.children.map((child) => (
        <BrandNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          activeStrategyId={activeStrategyId}
          onSelectStrategy={onSelectStrategy}
          onCloseDropdown={onCloseDropdown}
        />
      ))}
    </>
  );
}
