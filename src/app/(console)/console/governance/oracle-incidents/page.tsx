"use client";

/**
 * Console /console/governance/oracle-incidents — ADR-0014.
 *
 * Vue dédiée Oracle : groupe les ErrorEvent par code ORACLE-NNN, affiche
 * gouverneur (Mestor/Artemis/Seshat/Thot/Infrastructure), remediation, lien
 * vers les IntentEmission et stratégies impactées. Sur 7 jours par défaut.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { ORACLE_ERROR_CODES, type OracleErrorCode } from "@/server/services/strategy-presentation/error-codes";
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Compass,
  Eye,
  Wallet,
  Cpu,
} from "lucide-react";

const GOVERNOR_ICONS = {
  MESTOR: Compass,
  ARTEMIS: Sparkles,
  SESHAT: Eye,
  THOT: Wallet,
  INFRASTRUCTURE: Cpu,
} as const;

const GOVERNOR_COLORS = {
  MESTOR: "text-accent",
  ARTEMIS: "text-amber-300",
  SESHAT: "text-blue-300",
  THOT: "text-emerald-300",
  INFRASTRUCTURE: "text-foreground-secondary",
} as const;

const SEVERITY_COLORS: Record<string, string> = {
  WARN: "text-amber-300 bg-amber-500/10",
  ERROR: "text-error bg-error/10",
  CRITICAL: "text-error bg-error/20 ring-1 ring-red-500/40",
};

export default function OracleIncidentsPage() {
  const [showResolved, setShowResolved] = useState(false);
  const [sinceHours, setSinceHours] = useState(168);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: incidents, refetch } = trpc.errorVault.oracleIncidents.useQuery({
    resolved: showResolved,
    sinceHours,
    limit: 200,
  });

  const batchMut = trpc.errorVault.batchMarkResolved.useMutation({
    onSuccess: () => refetch(),
  });

  const totalOccurrences = incidents?.reduce((sum, i) => sum + i.totalOccurrences, 0) ?? 0;
  const totalStrategies = new Set(incidents?.flatMap((i) => i.uniqueStrategies) ?? []).size;
  const recoverableCount = incidents?.filter((i) => {
    const code = i.code as OracleErrorCode;
    return ORACLE_ERROR_CODES[code]?.recoverable;
  }).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oracle Incidents — triage gouverné"
        description="Erreurs du pipeline d'enrichissement Oracle (ADR-0014). Groupées par code ORACLE-NNN."
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Governance", href: "/console/governance" },
          { label: "Oracle Incidents" },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Codes actifs" value={incidents?.length ?? 0} color="text-accent" />
        <StatTile label="Occurrences" value={totalOccurrences} color="text-foreground" />
        <StatTile label="Stratégies impactées" value={totalStrategies} color="text-amber-300" />
        <StatTile
          label="Récupérables"
          value={`${recoverableCount}/${incidents?.length ?? 0}`}
          color="text-emerald-300"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowResolved(false)}
          className={`rounded-full px-3 py-1 text-xs ${!showResolved ? "bg-error/15 text-error" : "bg-white/5 text-foreground-secondary"}`}
        >
          Non résolus
        </button>
        <button
          onClick={() => setShowResolved(true)}
          className={`rounded-full px-3 py-1 text-xs ${showResolved ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-foreground-secondary"}`}
        >
          Résolus
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-foreground-secondary">
          <span>Fenêtre :</span>
          {[24, 72, 168, 720].map((h) => (
            <button
              key={h}
              onClick={() => setSinceHours(h)}
              className={`rounded px-2 py-1 ${sinceHours === h ? "bg-accent/15 text-accent" : "bg-white/5"}`}
            >
              {h === 24 ? "24h" : h === 72 ? "3j" : h === 168 ? "7j" : "30j"}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents */}
      {!incidents || incidents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
          <p className="text-sm text-foreground-secondary">
            {showResolved ? "Aucun incident Oracle résolu sur cette période." : "Aucun incident Oracle actif. Le pipeline tourne sain."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {incidents.map((c) => {
            const code = c.code as OracleErrorCode;
            const meta = ORACLE_ERROR_CODES[code];
            const Icon = meta ? GOVERNOR_ICONS[meta.governor] : AlertTriangle;
            const colorClass = meta ? GOVERNOR_COLORS[meta.governor] : "text-foreground-secondary";
            const isExpanded = expanded === c.code;

            return (
              <div
                key={c.code}
                className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]"
              >
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="flex flex-1 items-start gap-3 min-w-0">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${colorClass} mt-0.5`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SEVERITY_COLORS[c.severity] ?? "text-foreground-secondary bg-white/5"}`}>
                          {c.severity}
                        </span>
                        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-foreground">
                          {c.code}
                        </span>
                        {meta && (
                          <span className={`text-[10px] uppercase tracking-wider ${colorClass}`}>
                            {meta.governor}
                          </span>
                        )}
                        {meta?.recoverable && (
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
                            recoverable
                          </span>
                        )}
                        <span className="text-[10px] text-foreground-secondary">×{c.totalOccurrences}</span>
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {meta?.fr ?? c.sample.message}
                      </div>
                      {meta?.hint && (
                        <div className="mt-1 text-[11px] text-foreground-secondary">
                          → {meta.hint}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-foreground-tertiary">
                        <span>{c.uniqueStrategies.length} stratégie(s)</span>
                        <span>{c.uniqueIntents.length} intent(s)</span>
                        <span>Premier : {new Date(c.firstSeenAt).toLocaleString()}</span>
                        <span>Dernier : {new Date(c.lastSeenAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : c.code)}
                      className="rounded bg-white/5 px-2 py-1 text-[10px] hover:bg-white/10"
                    >
                      {isExpanded ? "Réduire" : "Détail"}
                    </button>
                    {!showResolved && (
                      <button
                        onClick={() =>
                          confirm(`Marquer toutes les occurrences ${c.code} comme résolues ?`) &&
                          batchMut.mutate({
                            signature: c.sample.signature,
                            reason: `Triage Oracle: ${c.code}`,
                          })
                        }
                        className="rounded bg-emerald-500/15 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/25"
                      >
                        ✓ Résoudre
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/5 bg-black/40 p-3 space-y-2">
                    {c.sample.context !== null && c.sample.context !== undefined && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-foreground-tertiary mb-1">Context</div>
                        <pre className="text-[10px] text-foreground-tertiary overflow-x-auto">
                          {JSON.stringify(c.sample.context, null, 2)}
                        </pre>
                      </div>
                    )}
                    {c.sample.stack && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-foreground-tertiary mb-1">Stack</div>
                        <pre className="text-[10px] text-foreground-tertiary overflow-x-auto">
                          {c.sample.stack}
                        </pre>
                      </div>
                    )}
                    {c.uniqueStrategies.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-foreground-tertiary mb-1">
                          Stratégies impactées
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {c.uniqueStrategies.slice(0, 20).map((sid) => (
                            <span
                              key={sid}
                              className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-foreground-secondary"
                            >
                              {sid.slice(0, 12)}
                            </span>
                          ))}
                          {c.uniqueStrategies.length > 20 && (
                            <span className="text-[10px] text-foreground-tertiary">
                              +{c.uniqueStrategies.length - 20}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="text-xs uppercase tracking-wider text-foreground-tertiary">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
