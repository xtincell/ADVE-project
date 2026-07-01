"use client";

/**
 * Console — Sync canon UPgraders (Vague 10).
 * Pousse les 8 piliers canon (100 % contrats COMPLETE) dans la base LIVE
 * via le Pillar Gateway, recalcule le score, matérialise le vector.
 * C'est le bouton qui répare « l'ADVERTIS d'UPgraders n'est pas à 100 % »
 * en prod sans accès DB direct.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Rocket, CheckCircle2, AlertTriangle } from "lucide-react";
import { PILLAR_KEYS } from "@/domain";

export default function CanonSyncPage() {
  const utils = trpc.useUtils();
  const { data: status, isLoading } = trpc.canonSync.status.useQuery();
  const sync = trpc.canonSync.syncUpgraders.useMutation({
    onSuccess: () => utils.canonSync.status.invalidate(),
  });
  const [confirmed, setConfirmed] = useState(false);

  if (isLoading) return <SkeletonPage />;

  const completion = status?.exists ? status.completion : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Canon UPgraders"
        description="Synchronise la stratégie « La Fusée — Industry OS » avec le canon 100 % (8 piliers alignés sur les contrats de maturité). Passe par le Pillar Gateway (validation + versioning + score) — idempotent, re-synchronisable."
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Gouvernance", href: "/console/governance" },
          { label: "Canon UPgraders" },
        ]}
      />

      {/* État courant */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">État en base</h2>
        {!status?.exists ? (
          <p className="mt-2 text-sm text-warning">
            Stratégie UPgraders absente — le sync la créera (client + stratégie + 8 piliers).
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {PILLAR_KEYS.map((k) => {
                const pct = completion?.byPillar?.[k] ?? 0;
                return (
                  <span
                    key={k}
                    className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${
                      pct >= 100 ? "bg-success/15 text-success" : pct >= 60 ? "bg-warning/15 text-warning" : "bg-error/15 text-error"
                    }`}
                  >
                    {k} · {pct}%
                  </span>
                );
              })}
            </div>
            <p className="text-xs text-foreground-muted">
              ADVE {completion?.advePct ?? 0}% · ADVERTIS {completion?.advertisPct ?? 0}% ·{" "}
              {completion?.complete ? "noyau COMPLET ✓" : "noyau incomplet — sync recommandé"}
            </p>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Rocket className="h-4 w-4 text-accent" /> Synchroniser le canon
        </h2>
        <p className="mt-2 text-xs text-foreground-muted">
          Remplace le contenu des 8 piliers par le canon (REPLACE_FULL via Gateway — chaque version
          précédente reste dans l'historique PillarVersion, Loi 1). Recalcule le score /200 et
          matérialise le pilier vector. Les recommandations Notoria et la readiness RTIS se
          débloquent immédiatement après.
        </p>
        <label className="mt-3 flex items-center gap-2 text-xs text-foreground-secondary">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          Je comprends que le contenu actuel des 8 piliers sera remplacé (versions conservées).
        </label>
        <button
          onClick={() => sync.mutate({})}
          disabled={!confirmed || sync.isPending}
          className="mt-3 flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
        >
          {sync.isPending ? "Synchronisation…" : "Sync canon UPgraders (8 piliers + score)"}
        </button>
        {sync.error && (
          <p className="mt-2 flex items-center gap-1 text-xs text-error">
            <AlertTriangle className="h-3 w-3" /> {sync.error.message}
          </p>
        )}
        {sync.data && (
          <div className="mt-3 rounded-lg border border-success/40 bg-success/10 p-3 text-xs">
            <p className="flex items-center gap-1 font-medium text-success">
              <CheckCircle2 className="h-3 w-3" /> Sync terminé — composite {sync.data.composite}/200 ·
              ADVE {sync.data.completion.advePct}% · ADVERTIS {sync.data.completion.advertisPct}%
            </p>
            <p className="mt-1 text-foreground-muted">
              {Object.entries(sync.data.pillars)
                .map(([k, r]) => `${k.toUpperCase()}:${r.ok ? "✓" : `✗ ${r.error ?? ""}`}`)
                .join(" · ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
