"use client";

/**
 * OracleCatalogPage — Console "consult-before-arming" catalog of the 35 Oracle
 * sections (Phase 24). For each section: subtitle + description, the runner that
 * produces it (Glory sequence / tool / framework / mapper), the ADVERTIS
 * variables it consumes, the BrandAsset it produces, its cost (deterministic =
 * free vs LLM = billed), and how it feeds the Oracle (number + tier). Sections
 * with no documentation source are flagged, not hidden.
 *
 * Read-only over `trpc.oracle.catalog` (static metadata, no strategy).
 */

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { PILLAR_METADATA } from "@/domain/pillars";
import type { OracleCatalogEntry } from "@/server/services/strategy-presentation/oracle-catalog";
import { Coins, Zap, AlertTriangle, Boxes, ArrowRight } from "lucide-react";

const TIER_ORDER = ["CORE", "BIG4_BASELINE", "DISTINCTIVE"] as const;
const TIER_LABEL: Record<string, string> = { CORE: "Core", BIG4_BASELINE: "Big 4 (baseline)", DISTINCTIVE: "Distinctif La Fusée" };
const RUNNER_LABEL: Record<string, string> = {
  GLORY_SEQUENCE: "Séquence Glory",
  GLORY_TOOL: "Glory tool",
  FRAMEWORK: "Framework",
  PURE_MAPPER: "Mapper déterministe",
};

type TierFilter = "ALL" | (typeof TIER_ORDER)[number];

export function OracleCatalogPage() {
  const query = trpc.oracle.catalog.useQuery();
  const [tierFilter, setTierFilter] = useState<TierFilter>("ALL");
  const [gapsOnly, setGapsOnly] = useState(false);

  const entries = useMemo(() => query.data ?? [], [query.data]);
  const stats = useMemo(() => ({
    total: entries.length,
    byTier: Object.fromEntries(TIER_ORDER.map((t) => [t, entries.filter((e) => e.tier === t).length])),
    gaps: entries.filter((e) => e.hasGap).length,
    llm: entries.filter((e) => e.cost.class === "LLM").length,
  }), [entries]);

  const filtered = useMemo(
    () => entries.filter((e) => (tierFilter === "ALL" || e.tier === tierFilter) && (!gapsOnly || e.hasGap)),
    [entries, tierFilter, gapsOnly],
  );

  if (query.isLoading) return <SkeletonPage />;

  return (
    <article className="mx-auto max-w-[var(--maxw-content,1200px)] px-[var(--pad-page,1.5rem)] py-8 md:py-12">
      <header className="mb-8 border-b border-border-subtle pb-6">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
          <Boxes className="h-3.5 w-3.5 text-accent" />
          <span>Catalogue Oracle · Console Industry</span>
        </div>
        <h1 className="font-display font-semibold tracking-tighter leading-[0.95] text-foreground" style={{ fontSize: "var(--text-display)" }}>
          Les 35 sections.
        </h1>
        <p className="mt-3 max-w-[64ch] text-foreground-secondary" style={{ fontSize: "var(--text-lg)" }}>
          Consulter <span className="font-serif italic">avant d&rsquo;armer</span> : ce que chaque section est, l&rsquo;outil qui la produit, les variables ADVERTIS qu&rsquo;elle consomme, le livrable qu&rsquo;elle produit, et ce qu&rsquo;elle coûte.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          <span><strong className="text-foreground">{stats.total}</strong> sections</span>
          {TIER_ORDER.map((t) => (
            <span key={t}>{TIER_LABEL[t]} · <strong className="text-foreground">{stats.byTier[t]}</strong></span>
          ))}
          <span>LLM · <strong className="text-accent">{stats.llm}</strong></span>
          <span>Trous · <strong className={stats.gaps > 0 ? "text-error" : "text-success"}>{stats.gaps}</strong></span>
        </div>
      </header>

      {/* Filters */}
      <nav className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border-subtle pb-4">
        {(["ALL", ...TIER_ORDER] as TierFilter[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTierFilter(t)}
            className={`font-mono text-[11px] uppercase tracking-widest transition-colors ${tierFilter === t ? "text-accent" : "text-foreground-muted hover:text-foreground"}`}
          >
            {t === "ALL" ? "Toutes" : TIER_LABEL[t]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setGapsOnly((v) => !v)}
          className={`ml-auto flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${gapsOnly ? "text-error" : "text-foreground-muted hover:text-foreground"}`}
        >
          <AlertTriangle className="h-3 w-3" /> Trous seulement
        </button>
      </nav>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((e) => <SectionCard key={e.id} entry={e} />)}
      </div>
      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-foreground-muted">Aucune section pour ce filtre.</p>
      ) : null}
    </article>
  );
}

function SectionCard({ entry: e }: { entry: OracleCatalogEntry }) {
  return (
    <div className="flex flex-col rounded-lg border border-white/5 bg-surface-raised p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-foreground-muted">{e.number}</span>
            <span className="truncate text-sm font-semibold text-foreground">{e.title}</span>
          </div>
          {e.subtitle ? <p className="mt-0.5 text-xs font-medium text-accent">{e.subtitle}</p> : null}
        </div>
        <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-widest text-foreground-muted">{TIER_LABEL[e.tier]}</span>
      </div>

      {e.description ? (
        <p className="mb-3 text-xs leading-relaxed text-foreground-secondary">{e.description}</p>
      ) : (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-error"><AlertTriangle className="h-3 w-3" /> Description à compléter.</p>
      )}

      <dl className="mt-auto space-y-2 border-t border-white/5 pt-3 text-[11px]">
        <Row label="Produit par">
          {e.runner ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-foreground-muted">{RUNNER_LABEL[e.runner.kind] ?? e.runner.kind}</span>
              <span className="font-mono text-foreground-secondary">{e.runnerName ?? e.runner.ref}</span>
            </span>
          ) : <span className="text-foreground-muted">—</span>}
        </Row>

        <Row label="Consomme">
          {e.consumesPillars.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {e.consumesPillars.map((p) => (
                <span key={p} title={PILLAR_METADATA[p as keyof typeof PILLAR_METADATA]?.displayName ?? p} className="flex h-4 w-4 items-center justify-center rounded-full bg-accent/15 text-[9px] font-bold text-accent">{p}</span>
              ))}
            </span>
          ) : <span className="text-foreground-muted">dérivé de l&rsquo;assemblage ADVERTIS</span>}
        </Row>

        <Row label="Produit">
          <span className="inline-flex items-center gap-1 font-mono text-foreground-secondary">
            <ArrowRight className="h-3 w-3 text-foreground-muted" />{e.produces ?? "—"}
          </span>
        </Row>

        <Row label="Coût">
          {e.cost.class === "LLM" ? (
            <span className="inline-flex items-center gap-1.5 text-accent">
              <Zap className="h-3 w-3" /> LLM · ~${e.cost.estimateUsd.toFixed(2)} · {e.cost.llmSteps} appel{e.cost.llmSteps > 1 ? "s" : ""}
            </span>
          ) : e.cost.class === "DETERMINISTIC" ? (
            <span className="inline-flex items-center gap-1.5 text-success">
              <Coins className="h-3 w-3" /> Déterministe · gratuit
            </span>
          ) : (
            <span className="text-foreground-muted">inconnu</span>
          )}
        </Row>
      </dl>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-foreground-muted/70">{label}</dt>
      <dd className="min-w-0 text-right text-foreground-secondary">{children}</dd>
    </div>
  );
}
