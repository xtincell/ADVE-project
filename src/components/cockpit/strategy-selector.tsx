"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Building2, Check, Search, X, Settings, Plus, Folder,
  ChevronDown, Globe2, Star, Crown, Flame, Shield, Eye, Skull,
} from "lucide-react";
import { useStrategy } from "./strategy-context";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

/**
 * Phase 18 (ADR-0059) — Brand Picker Modal.
 *
 * Round 5 (2026-05-07). Format final décidé après itérations sélecteur :
 *   round 1-3 = dropdown (rejeté : "inadapté, plus il y aura de marques
 *              plus ce sera illisible")
 *   round 4   = filtre brand-only mais toujours dropdown (encore rejeté)
 *   round 5   = MODAL plein écran avec barre de recherche + filtres
 *               (operator, classification) + grille de tuiles avec score
 *               et badges. C'est ce que le user a demandé explicitement.
 *
 * Le bouton header est minimal — il affiche juste la marque active +
 * chevron. Click → ouvre le modal pleine largeur. Cmd+K aussi.
 *
 * Strict niveau marque : CORPORATE / MASTER_BRAND / STANDALONE_BRAND.
 * Les regions (REGIONAL_BRAND) sont accessibles via le
 * `<BrandMarketCommutator>` à l'intérieur de chaque page brand.
 */
export function StrategySelector() {
  const { strategyId } = useStrategy();
  const [open, setOpen] = useState(false);

  const { data: tree, isLoading } = trpc.strategy.brandTreeForSelector.useQuery(
    {},
    { staleTime: 30_000 },
  );

  // Cmd+K opens modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm">
        <Building2 className="h-3.5 w-3.5 text-foreground-muted animate-pulse" />
        <span className="text-foreground-muted">Chargement...</span>
      </div>
    );
  }

  // Resolve current label
  const current = tree
    ? [...tree.nodes.map((n) => n.strategy ? { id: n.strategy.id, name: n.name } : null), ...tree.standaloneStrategies]
        .filter((x): x is { id: string; name: string } => !!x)
        .find((x) => x.id === strategyId)
    : undefined;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm transition-colors hover:border-border-strong hover:bg-background"
        title="Cmd+K pour changer de marque"
      >
        <Building2 className="h-3.5 w-3.5 text-accent" />
        <span className="max-w-[220px] truncate font-medium text-white">
          {current?.name ?? "Selectionner une marque"}
        </span>
        <ChevronDown className="h-3 w-3 text-foreground-muted" />
      </button>
      {open && tree && <BrandPickerModal tree={tree} onClose={() => setOpen(false)} />}
    </>
  );
}

// ── Brand Picker Modal ──────────────────────────────────────────────────────

interface BrandTreeData {
  nodes: Array<{
    id: string;
    name: string;
    slug: string;
    nodeKind: string;
    countryCode: string | null;
    parentNodeId: string | null;
    strategyId: string | null;
    strategy: { id: string; name: string; status: string; advertis_vector?: unknown } | null;
  }>;
  standaloneStrategies: Array<{ id: string; name: string; status: string; advertis_vector?: unknown }>;
}

interface Tile {
  key: string;
  // Strategy active si attachée
  strategyId: string | null;
  strategyStatus: string | null;
  composite: number | null;
  classification: BrandClassification | null;
  // Brand metadata
  name: string;
  slug: string | null;
  nodeKind: string;
  parentName: string | null;
  // Action
  action: "ACTIVATE_STRATEGY" | "GO_PORTFOLIO";
  href: string | null;
}

type BrandClassification = "ZOMBIE" | "ORDINAIRE" | "FORTE" | "CULTE" | "ICONE";

const CLASSIF_BADGES: Record<BrandClassification, { label: string; icon: typeof Skull; color: string }> = {
  ZOMBIE:    { label: "Zombie",    icon: Skull,  color: "bg-zinc-700/30 text-zinc-300" },
  ORDINAIRE: { label: "Ordinaire", icon: Eye,    color: "bg-zinc-600/30 text-zinc-200" },
  FORTE:     { label: "Forte",     icon: Shield, color: "bg-blue-500/20 text-blue-300" },
  CULTE:     { label: "Culte",     icon: Flame,  color: "bg-amber-500/20 text-amber-300" },
  ICONE:     { label: "Icône",     icon: Crown,  color: "bg-accent/20 text-accent" },
};

const KIND_LABELS: Record<string, string> = {
  CORPORATE:        "Corporate",
  MASTER_BRAND:     "Master brand",
  STANDALONE_BRAND: "Marque solo",
};

function classifyComposite(c: number | null): BrandClassification | null {
  if (c == null) return null;
  if (c <= 80) return "ZOMBIE";
  if (c <= 120) return "ORDINAIRE";
  if (c <= 160) return "FORTE";
  if (c <= 180) return "CULTE";
  return "ICONE";
}

function BrandPickerModal({ tree, onClose }: { tree: BrandTreeData; onClose: () => void }) {
  const { strategyId, setStrategyId } = useStrategy();
  const [query, setQuery] = useState("");
  const [filterKind, setFilterKind] = useState<"ALL" | "CORPORATE" | "MASTER_BRAND" | "STANDALONE_BRAND">("ALL");
  const [filterClass, setFilterClass] = useState<"ALL" | BrandClassification | "UNPILOTED">("ALL");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Build tiles from brand nodes + standalone strategies
  const tiles = useMemo<Tile[]>(() => {
    const nodesById = new Map(tree.nodes.map((n) => [n.id, n]));
    const out: Tile[] = [];

    for (const n of tree.nodes) {
      const parent = n.parentNodeId ? nodesById.get(n.parentNodeId) : null;
      const composite = readComposite(n.strategy?.advertis_vector);
      out.push({
        key: `node-${n.id}`,
        strategyId: n.strategy?.id ?? null,
        strategyStatus: n.strategy?.status ?? null,
        composite,
        classification: classifyComposite(composite),
        name: n.name,
        slug: n.slug,
        nodeKind: n.nodeKind,
        parentName: parent?.name ?? null,
        action: n.strategy ? "ACTIVATE_STRATEGY" : "GO_PORTFOLIO",
        href: n.strategy ? null : `/cockpit/portfolio/${n.slug}`,
      });
    }
    for (const s of tree.standaloneStrategies) {
      const composite = readComposite(s.advertis_vector);
      out.push({
        key: `standalone-${s.id}`,
        strategyId: s.id,
        strategyStatus: s.status,
        composite,
        classification: classifyComposite(composite),
        name: s.name,
        slug: null,
        nodeKind: "STANDALONE_BRAND",
        parentName: null,
        action: "ACTIVATE_STRATEGY",
        href: null,
      });
    }

    return out;
  }, [tree]);

  const filtered = useMemo(() => {
    return tiles.filter((t) => {
      if (filterKind !== "ALL" && t.nodeKind !== filterKind) return false;
      if (filterClass === "UNPILOTED") {
        if (t.strategyId) return false;
      } else if (filterClass !== "ALL") {
        if (t.classification !== filterClass) return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = `${t.name} ${t.parentName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tiles, query, filterKind, filterClass]);

  // Build hierarchical groups: each CORPORATE umbrella is one group that
  // contains the CORPORATE tile itself (in pole position) + every
  // MASTER_BRAND child (matched by parentName === CORPORATE.name). The
  // STANDALONE brands fall into a single "Marques solo" group.
  // Orphan MASTER_BRAND (parent CORPORATE filtered out by user) become
  // their own group keyed by parentName so they don't disappear.
  const grouped = useMemo(() => {
    const corporateByName = new Map<string, Tile>();
    for (const t of filtered) {
      if (t.nodeKind === "CORPORATE") corporateByName.set(t.name, t);
    }

    const groups = new Map<string, BrandGroup>();
    const standaloneGroup: BrandGroup = {
      key: "__standalone__",
      label: "Marques solo",
      umbrella: null,
      children: [],
    };

    for (const t of filtered) {
      if (t.nodeKind === "CORPORATE") {
        // Promote the CORPORATE itself as the umbrella of its named group.
        const existing = groups.get(t.name);
        if (existing) existing.umbrella = t;
        else groups.set(t.name, { key: t.name, label: t.name, umbrella: t, children: [] });
        continue;
      }
      if (t.nodeKind === "STANDALONE_BRAND") {
        standaloneGroup.children.push(t);
        continue;
      }
      // MASTER_BRAND (or any other sub-brand) — attach to its parent group.
      const parentName = t.parentName ?? "Sans parent";
      const existing = groups.get(parentName);
      if (existing) {
        existing.children.push(t);
      } else {
        // Parent CORPORATE n'est pas dans le filtre courant — créer un
        // groupe orphelin pour ne pas perdre la marque.
        const umbrellaTile = corporateByName.get(parentName) ?? null;
        groups.set(parentName, {
          key: parentName,
          label: parentName,
          umbrella: umbrellaTile,
          children: [t],
        });
      }
    }

    const groupList = [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
    if (standaloneGroup.children.length > 0) groupList.push(standaloneGroup);
    return { groups: groupList };
  }, [filtered]);

  function handleSelect(tile: Tile) {
    if (tile.action === "ACTIVATE_STRATEGY" && tile.strategyId) {
      setStrategyId(tile.strategyId);
      onClose();
    }
    // GO_PORTFOLIO is handled as Link href
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/85 backdrop-blur-md p-4 sm:p-8"
      onClick={onClose}
      style={{ isolation: "isolate" }}
    >
      <div
        className="relative flex h-full max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — close + title + count */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-white">Sélectionner une marque</h2>
            <p className="text-xs text-foreground-muted">
              {filtered.length} sur {tiles.length} marque{tiles.length > 1 ? "s" : ""}
              {" · "}
              {tiles.filter((t) => t.strategyId).length} pilotable{tiles.filter((t) => t.strategyId).length > 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-foreground-muted hover:bg-background-overlay hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search + filters bar */}
        <div className="border-b border-border bg-background-overlay/30 px-5 py-3 space-y-2">
          {/* Search */}
          <div className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2">
            <Search className="h-4 w-4 flex-shrink-0 text-foreground-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom, parent…"
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-foreground-muted"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-foreground-muted hover:text-white" aria-label="Effacer">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="hidden sm:inline-flex items-center gap-0.5 rounded bg-foreground-muted/10 px-1.5 py-0.5 text-[10px] font-mono text-foreground-muted">
              ⌘K
            </span>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-1">
            <FilterPill active={filterKind === "ALL"} onClick={() => setFilterKind("ALL")} label="Tous niveaux" />
            <FilterPill active={filterKind === "CORPORATE"} onClick={() => setFilterKind("CORPORATE")} label="Corporate" />
            <FilterPill active={filterKind === "MASTER_BRAND"} onClick={() => setFilterKind("MASTER_BRAND")} label="Master" />
            <FilterPill active={filterKind === "STANDALONE_BRAND"} onClick={() => setFilterKind("STANDALONE_BRAND")} label="Solo" />
            <span className="mx-1 self-center text-foreground-muted/30">·</span>
            <FilterPill active={filterClass === "ALL"} onClick={() => setFilterClass("ALL")} label="Toutes classifs" />
            <FilterPill active={filterClass === "ICONE"} onClick={() => setFilterClass("ICONE")} label="Icône" />
            <FilterPill active={filterClass === "CULTE"} onClick={() => setFilterClass("CULTE")} label="Culte" />
            <FilterPill active={filterClass === "FORTE"} onClick={() => setFilterClass("FORTE")} label="Forte" />
            <FilterPill active={filterClass === "ORDINAIRE"} onClick={() => setFilterClass("ORDINAIRE")} label="Ordinaire" />
            <FilterPill active={filterClass === "ZOMBIE"} onClick={() => setFilterClass("ZOMBIE")} label="Zombie" />
            <FilterPill active={filterClass === "UNPILOTED"} onClick={() => setFilterClass("UNPILOTED")} label="Non piloté" />
          </div>
        </div>

        {/* Body — groupes unifiés (umbrella + children) collapsibles */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {grouped.groups.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-20 text-sm text-foreground-muted">
              Aucune marque ne correspond aux filtres.
            </div>
          ) : (
            grouped.groups.map((g) => (
              <CollapsibleGroup
                key={g.key}
                group={g}
                activeStrategyId={strategyId}
                onSelect={handleSelect}
                onClose={onClose}
                // Auto-collapse: garder ouvert si search active OU si le groupe contient la marque active.
                forceOpen={
                  query.trim().length > 0 ||
                  g.umbrella?.strategyId === strategyId ||
                  g.children.some((c) => c.strategyId === strategyId)
                }
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/cockpit/portfolio"
            onClick={onClose}
            className="flex items-center gap-2 rounded text-xs text-foreground-secondary hover:text-white"
          >
            <Folder className="h-3.5 w-3.5" />
            Voir l&apos;arbre portfolio complet
          </Link>
          <Link
            href="/cockpit/new"
            onClick={onClose}
            className="flex items-center gap-2 rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/80"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvelle marque
          </Link>
        </div>
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-border bg-transparent text-foreground-muted hover:border-border-strong hover:text-foreground-secondary"
      }`}
    >
      {label}
    </button>
  );
}

interface BrandGroup {
  key: string;
  label: string;
  /** Le CORPORATE umbrella (ou null si groupe orphelin standalone). */
  umbrella: Tile | null;
  /** Les MASTER_BRAND children (ou STANDALONE si label === "Marques solo"). */
  children: Tile[];
}

function CollapsibleGroup({
  group,
  activeStrategyId,
  onSelect,
  onClose,
  forceOpen,
}: {
  group: BrandGroup;
  activeStrategyId: string | null;
  onSelect: (t: Tile) => void;
  onClose: () => void;
  forceOpen: boolean;
}) {
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const totalTiles = (group.umbrella ? 1 : 0) + group.children.length;
  // Effective open state: forceOpen (search/active) OR user toggle OR default (open by default).
  const isOpen = forceOpen || (userToggled !== null ? userToggled : true);

  const pilotableCount = (group.umbrella?.strategyId ? 1 : 0) + group.children.filter((c) => c.strategyId).length;

  return (
    <section className="rounded-lg border border-border/40 bg-zinc-900/30">
      {/* Header — toggle + label + counts */}
      <button
        type="button"
        onClick={() => setUserToggled((prev) => (prev === null ? !isOpen : !prev))}
        disabled={forceOpen}
        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors ${
          forceOpen ? "cursor-default" : "hover:bg-zinc-900/60"
        }`}
        aria-expanded={isOpen}
      >
        {forceOpen ? (
          <span className="h-3.5 w-3.5 flex-shrink-0 text-foreground-muted/40" aria-hidden>
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
        ) : (
          <ChevronDown
            className={`h-3.5 w-3.5 flex-shrink-0 text-foreground-muted transition-transform ${
              isOpen ? "" : "-rotate-90"
            }`}
          />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
          {group.label}
        </span>
        <span className="text-[11px] text-foreground-muted/60">
          · {totalTiles} marque{totalTiles > 1 ? "s" : ""}
          {pilotableCount > 0 && pilotableCount < totalTiles && (
            <span className="ml-1 text-foreground-muted/40">({pilotableCount} pilotable{pilotableCount > 1 ? "s" : ""})</span>
          )}
        </span>
      </button>

      {/* Body */}
      {isOpen && (
        <div className="space-y-3 px-4 pb-4">
          {group.umbrella && (
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-accent/70">Marque ombrelle</p>
              <BrandTile
                tile={group.umbrella}
                isActive={group.umbrella.strategyId === activeStrategyId}
                onSelect={onSelect}
                onClose={onClose}
                emphasized
              />
            </div>
          )}
          {group.children.length > 0 && (
            <div>
              {group.umbrella && (
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
                  Marques produits ({group.children.length})
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.children.map((t) => (
                  <BrandTile
                    key={t.key}
                    tile={t}
                    isActive={t.strategyId === activeStrategyId}
                    onSelect={onSelect}
                    onClose={onClose}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BrandTile({
  tile,
  isActive,
  onSelect,
  onClose,
  emphasized = false,
}: {
  tile: Tile;
  isActive: boolean;
  onSelect: (t: Tile) => void;
  onClose: () => void;
  /** True for the CORPORATE umbrella tile of a group — rendered larger
   *  with a subtle accent border to signal "the brand that imprints all
   *  its sub-brands" (FrieslandCampina au-dessus de Bonnet Rouge etc.). */
  emphasized?: boolean;
}) {
  const isPiloted = !!tile.strategyId;
  const classifBadge = tile.classification ? CLASSIF_BADGES[tile.classification] : null;
  const ClassifIcon = classifBadge?.icon ?? null;

  const padding = emphasized ? "p-5" : "p-4";
  const baseClass = `group flex h-full flex-col gap-2 rounded-lg border ${padding} text-left transition-all ${
    isActive
      ? "border-accent bg-accent/10 ring-1 ring-accent"
      : emphasized
        ? "border-accent/40 bg-accent/5 hover:border-accent/70 hover:bg-accent/10"
        : "border-border bg-background-overlay/40 hover:border-border-strong hover:bg-background-overlay"
  }`;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{tile.name}</p>
          <p className="text-[10px] uppercase tracking-wider text-foreground-muted">
            {KIND_LABELS[tile.nodeKind] ?? tile.nodeKind}
            {tile.parentName && ` · ${tile.parentName}`}
          </p>
        </div>
        {isActive && <Check className="h-4 w-4 flex-shrink-0 text-accent" />}
      </div>

      {/* Score line */}
      {isPiloted && tile.composite != null ? (
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-white tabular-nums">{Math.round(tile.composite)}</span>
          <span className="mb-0.5 text-[10px] text-foreground-muted">/200</span>
          {classifBadge && ClassifIcon && (
            <span className={`ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${classifBadge.color}`}>
              <ClassifIcon className="h-3 w-3" />
              {classifBadge.label}
            </span>
          )}
        </div>
      ) : isPiloted ? (
        <p className="text-[11px] italic text-foreground-muted">Score non encore calculé</p>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
          <Settings className="h-3 w-3" />
          Pas encore piloté
        </div>
      )}

      {/* Status */}
      <div className="mt-auto flex items-center gap-2 pt-1 text-[10px] text-foreground-muted">
        {tile.strategyStatus && tile.strategyStatus !== "ACTIVE" && (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">{tile.strategyStatus}</span>
        )}
        {!isPiloted && (
          <span className="rounded bg-foreground-muted/15 px-1.5 py-0.5">Configurer →</span>
        )}
      </div>
    </>
  );

  if (tile.action === "GO_PORTFOLIO" && tile.href) {
    return (
      <Link href={tile.href} onClick={onClose} className={baseClass}>
        {inner}
      </Link>
    );
  }

  return (
    <button onClick={() => onSelect(tile)} className={baseClass}>
      {inner}
    </button>
  );
}

function readComposite(advertis_vector: unknown): number | null {
  if (!advertis_vector || typeof advertis_vector !== "object") return null;
  const v = (advertis_vector as Record<string, unknown>).composite;
  return typeof v === "number" ? v : null;
}
