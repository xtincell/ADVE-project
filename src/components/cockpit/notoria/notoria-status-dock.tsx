"use client";

/**
 * NotoriaStatusDock — Floating status widget visible on every cockpit page.
 *
 * Donne en permanence à l'opérateur l'état du moteur Notoria :
 *   - 8 chips de pilier ADVERTIS (stale-aware via `byPillar`)
 *   - Compteur recos PENDING + ACCEPTED
 *   - CTA contextuel (étape courante du pipeline ADVERTIS)
 *
 * Source unique de vérité : `notoria.getDashboard.byPillar` qui dérive de
 * `getStrategyReadiness()` (governance layer). Pas d'inférence locale du
 * statut — toute logique d'état vit côté serveur (cf. ADR-0069).
 *
 * Le dock est collapsable (state local) pour ne pas gêner l'édition. Quand
 * il est replié, seul un pulse + count reco reste visible.
 */

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { PILLAR_STORAGE_KEYS, ADVE_STORAGE_KEYS, RTIS_STORAGE_KEYS } from "@/domain";
import {
  getPillarChipStatus,
  type PillarReadinessProjection,
} from "./lib/pillar-chip-status";
import { Sparkles, ChevronDown, ChevronUp, Activity, Loader2 } from "lucide-react";

const PILLAR_LABELS: Record<string, string> = {
  a: "A", d: "D", v: "V", e: "E",
  r: "R", t: "T", i: "I", s: "S",
};

export function NotoriaStatusDock() {
  const strategyId = useCurrentStrategyId();
  const [expanded, setExpanded] = useState(false);

  const dashboardQuery = trpc.notoria.getDashboard.useQuery(
    { strategyId: strategyId ?? "" },
    {
      enabled: !!strategyId,
      // Refresh moderately — useful for cross-page consistency without
      // hammering the readiness evaluator.
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    },
  );

  if (!strategyId) return null;

  const dashboard = dashboardQuery.data;
  const isLoading = dashboardQuery.isLoading;
  const byPillar = (dashboard?.byPillar ?? {}) as Record<string, PillarReadinessProjection>;

  // Total recos en attente d'arbitrage (PENDING + ACCEPTED non encore appliquées)
  const pendingByPillar = (dashboard?.pendingByPillar ?? {}) as Record<string, number>;
  const totalPending = Object.values(pendingByPillar).reduce((sum, n) => sum + (n ?? 0), 0);

  // Détermine l'étape courante du pipeline ADVERTIS (pour CTA contextuel)
  const isReady = (k: string) => {
    const p = byPillar[k];
    if (!p) return false;
    return getPillarChipStatus(p).isReadyForCascade;
  };
  const adveReady = isReady("a") && isReady("d") && isReady("v") && isReady("e");
  const rtReady = isReady("r") && isReady("t");
  const iReady = isReady("i");
  const sReady = isReady("s");

  let stageLabel: string;
  let stageColor: string;
  if (!adveReady) { stageLabel = "Compléter ADVE"; stageColor = "text-warning"; }
  else if (!rtReady) { stageLabel = "Lancer R + T"; stageColor = "text-error"; }
  else if (!iReady) { stageLabel = "Générer Potentiel (I)"; stageColor = "text-warning"; }
  else if (!sReady) { stageLabel = "Synthétiser Stratégie (S)"; stageColor = "text-error"; }
  else { stageLabel = "Améliorer en continu"; stageColor = "text-success"; }

  // Compte les piliers stale (advisory ou blocking) pour pulse visuel
  const staleCount = Object.values(byPillar).filter((p) => p?.stale).length;

  // ── Collapsed pill ───────────────────────────────────────────────
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        title="Recommandations — votre moteur de reco"
        className="fixed bottom-[calc(var(--mobile-tab-height,0px)+env(safe-area-inset-bottom)+68px)] right-4 z-40 flex items-center gap-2 md:bottom-20 rounded-full border border-white/10 bg-surface-raised/95 px-3 py-2 shadow-xl backdrop-blur transition-colors hover:bg-surface-raised"
      >
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isLoading ? "bg-info animate-ping" :
            staleCount > 0 ? "bg-warning animate-ping" :
            totalPending > 0 ? "bg-warning" :
            "bg-success"
          }`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${
            isLoading ? "bg-info" :
            staleCount > 0 ? "bg-warning" :
            totalPending > 0 ? "bg-warning" :
            "bg-success"
          }`} />
        </span>
        <Sparkles className="h-3.5 w-3.5 text-warning" />
        <span className="text-xs font-semibold text-white">Recommandations</span>
        {totalPending > 0 ? (
          <span className="rounded-full bg-warning/20 px-1.5 py-0.5 text-2xs font-bold text-warning">
            {totalPending}
          </span>
        ) : null}
        <ChevronUp className="h-3.5 w-3.5 text-foreground-muted" />
      </button>
    );
  }

  // ── Expanded panel ───────────────────────────────────────────────
  return (
    <div className="fixed bottom-[calc(var(--mobile-tab-height,0px)+env(safe-area-inset-bottom)+68px)] right-4 z-40 w-80 md:bottom-20 max-w-[calc(100vw-2rem)] rounded-lg border border-white/10 bg-surface-raised/95 p-3 shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-warning" />
          <span className="text-sm font-bold text-white">Recommandations</span>
          <span className="text-2xs text-foreground-muted">moteur de reco</span>
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin text-info" /> : null}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded p-0.5 text-foreground-muted hover:bg-white/5 hover:text-white"
          title="Réduire"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Étape courante */}
      <div className="mb-3 flex items-center gap-2 rounded border border-white/5 bg-white/[0.02] px-2 py-1.5">
        <Activity className={`h-3.5 w-3.5 ${stageColor}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[9px] uppercase tracking-wide text-foreground-muted">Étape</div>
          <div className={`text-xs font-semibold ${stageColor} truncate`}>{stageLabel}</div>
        </div>
        {totalPending > 0 ? (
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-2xs font-bold text-warning whitespace-nowrap">
            {totalPending} reco{totalPending > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {/* Chips piliers — 2 lignes ADVE / RTIS */}
      <div className="mb-3 space-y-1.5">
        {[
          { keys: ADVE_STORAGE_KEYS, label: "Fond." },
          { keys: RTIS_STORAGE_KEYS, label: "Strat." },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-1.5">
            <span className="w-9 text-[9px] font-semibold uppercase text-foreground-muted">{row.label}</span>
            <div className="flex flex-1 gap-1">
              {row.keys.map((k) => {
                const p = byPillar[k];
                const status = p
                  ? getPillarChipStatus(p)
                  : getPillarChipStatus({
                      completionLevel: "INCOMPLET",
                      stage: "EMPTY",
                      stale: false,
                      displayLabel: "Vide",
                      validationStatus: "DRAFT",
                      rtisCascadeReady: false,
                    });
                const count = pendingByPillar[k] ?? 0;
                return (
                  <div
                    key={k}
                    className="flex flex-1 items-center justify-between gap-0.5 rounded px-1.5 py-0.5"
                    title={`${PILLAR_STORAGE_KEYS.includes(k) ? k.toUpperCase() : k} · ${status.label}${count > 0 ? ` · ${count} reco(s)` : ""}`}
                  >
                    <span
                      className={`inline-flex h-4 min-w-[1.25rem] items-center justify-center rounded text-[9px] font-bold ${status.className}`}
                    >
                      {PILLAR_LABELS[k]}
                    </span>
                    {count > 0 ? (
                      <span className="rounded bg-warning/15 px-1 text-[8px] font-bold text-warning">
                        {count}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Lien Notoria + indicateur stale */}
      <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-2">
        {staleCount > 0 ? (
          <span className="text-2xs text-warning/80">
            {staleCount} pilier{staleCount > 1 ? "s" : ""} à rafraîchir
          </span>
        ) : (
          <span className="text-2xs text-foreground-muted">Tout est à jour</span>
        )}
        <Link
          href="/cockpit/brand/notoria"
          className="flex items-center gap-1 rounded bg-accent/15 px-2 py-1 text-2xs font-medium text-accent transition-colors hover:bg-accent/25"
        >
          <Sparkles className="h-3 w-3" />
          Ouvrir
        </Link>
      </div>
    </div>
  );
}
