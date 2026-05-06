"use client";

/**
 * Console /console/upgraders/economics — Phase 19 Vague 3, ADR-0052 Cluster F.
 *
 * Vue admin **UPgraders only** — économie agence anonymisée cross-clients.
 * Affiche :
 *   - Marges activity-type cluster (k-anonymity k≥5)
 *   - Forecast saturation crew agency-wide N semaines
 *
 * RBAC : restricted UPgraders Lead. La gate finale est dans le router via
 * `auditedProcedure("campaign-tracker")` — ce composant suppose un opérateur
 * Console authentifié.
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md §8
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lock,
  BarChart3,
  Users,
  Globe,
} from "lucide-react";

const SATURATION_BLOCKING = 0.85;
const SATURATION_WARNING = 0.7;

function pct(n: number | null | undefined, fractionDigits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(fractionDigits)}%`;
}

function fmtCurrency(n: number, currency = "XAF"): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export default function UpgradersEconomicsPage() {
  // Période par défaut : 90 derniers jours.
  const defaultEnd = new Date();
  const defaultStart = new Date(defaultEnd.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd] = useState(defaultEnd);
  const [strategyId, setStrategyId] = useState<string>("");

  const marginsQuery = trpc.campaignTracker.recomputeAgencyActivityMargins.useQuery(
    { strategyId, periodStart, periodEnd },
    { enabled: Boolean(strategyId) },
  );

  const saturationQuery = trpc.campaignTracker.evaluateResourceSaturation.useQuery(
    { strategyId, weeksAhead: 8 },
    { enabled: Boolean(strategyId) },
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Économie agence — Cluster F (UPgraders only)"
        description="Vue admin Phase 19 (ADR-0052 §8). Marges anonymisées k≥5 cross-clients + forecast saturation crew agency-wide. Toute mutation passe par auditedProcedure hash-chained."
      />

      <div className="rounded-lg bg-amber-400/10 p-4 ring-1 ring-inset ring-amber-400/30">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
          <Lock className="h-4 w-4" />
          Restricted — UPgraders Lead only
        </div>
        <p className="mt-1 text-xs text-foreground-secondary">
          Cette vue agrège des données cross-clients anonymisées (k-anonymity k≥5 par bucket). La désanonymisation est
          impossible par construction. Si vous voyez cette page sans autorisation appropriée, fermez immédiatement et
          contactez l'admin.
        </p>
      </div>

      {/* Sélecteur strategy + période */}
      <div className="rounded-lg bg-surface p-4 ring-1 ring-inset ring-border">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-foreground-secondary">Strategy ID (caller scope)</label>
            <input
              type="text"
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value)}
              placeholder="ex: cl_xxx"
              className="mt-1 w-full rounded border border-border bg-surface-secondary px-3 py-1.5 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground-secondary">Période début</label>
            <input
              type="date"
              value={periodStart.toISOString().slice(0, 10)}
              onChange={(e) => setPeriodStart(new Date(e.target.value))}
              className="mt-1 w-full rounded border border-border bg-surface-secondary px-3 py-1.5 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground-secondary">Période fin</label>
            <input
              type="date"
              value={periodEnd.toISOString().slice(0, 10)}
              disabled
              className="mt-1 w-full rounded border border-border bg-surface-secondary px-3 py-1.5 text-sm text-foreground-secondary"
            />
          </div>
        </div>
      </div>

      {!strategyId && (
        <div className="rounded-lg bg-surface p-8 text-center text-sm text-foreground-secondary ring-1 ring-inset ring-border">
          Renseigner une <code>strategyId</code> pour afficher les agrégats.
        </div>
      )}

      {/* Section Activity Margins */}
      {strategyId && (
        <section className="space-y-3">
          <header className="flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
            <BarChart3 className="h-4 w-4" />
            <span className="uppercase tracking-wide">Activity-type margins (k-anonymity k≥5)</span>
          </header>

          {marginsQuery.isLoading ? (
            <SkeletonPage />
          ) : marginsQuery.data?.ok ? (
            marginsQuery.data.margins.length === 0 ? (
              <div className="rounded-lg bg-surface p-8 text-center text-sm text-foreground-secondary ring-1 ring-inset ring-border">
                Aucun bucket avec k≥5 sur cette période. Élargir la période ou attendre plus de campaigns.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg ring-1 ring-inset ring-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-secondary text-xs uppercase tracking-wide text-foreground-secondary">
                    <tr>
                      <th className="px-4 py-2 text-left">Catégorie</th>
                      <th className="px-4 py-2 text-left">Sub-type</th>
                      <th className="px-4 py-2 text-left">Marché</th>
                      <th className="px-4 py-2 text-right">Mean margin</th>
                      <th className="px-4 py-2 text-right">Variance</th>
                      <th className="px-4 py-2 text-right">Tenants bucket</th>
                      <th className="px-4 py-2 text-left">Codes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {marginsQuery.data.margins.map((m, i) => (
                      <tr key={`${m.category}-${m.subType}-${m.market}-${i}`} className="bg-surface">
                        <td className="px-4 py-2 font-mono text-xs">{m.category}</td>
                        <td className="px-4 py-2 text-foreground">{m.subType ?? "—"}</td>
                        <td className="px-4 py-2 text-foreground-secondary">{m.market ?? "—"}</td>
                        <td className="px-4 py-2 text-right font-mono">{m.meanMargin > 0 ? fmtCurrency(m.meanMargin) : "—"}</td>
                        <td className="px-4 py-2 text-right font-mono">{m.variance.toFixed(2)}</td>
                        <td
                          className={`px-4 py-2 text-right font-mono text-xs ${
                            m.tenantBucketSize >= 5 ? "text-emerald-400" : "text-error"
                          }`}
                        >
                          {m.tenantBucketSize}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {m.degradationCodes.map((c) => (
                              <code
                                key={c}
                                className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-400"
                              >
                                {c}
                              </code>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="rounded-lg bg-error/10 p-4 text-sm text-error">Erreur récupération margins</div>
          )}
        </section>
      )}

      {/* Section Resource Saturation */}
      {strategyId && (
        <section className="space-y-3">
          <header className="flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
            <Users className="h-4 w-4" />
            <span className="uppercase tracking-wide">Resource saturation forecast (8 semaines)</span>
          </header>

          {saturationQuery.isLoading ? (
            <SkeletonPage />
          ) : saturationQuery.data?.ok && saturationQuery.data.forecast.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              {saturationQuery.data.forecast.map((week) => {
                const blocking = week.blocking;
                const warning = !blocking && week.saturationRatio > SATURATION_WARNING;
                const Icon = blocking ? AlertTriangle : warning ? AlertTriangle : CheckCircle2;
                const colorClass = blocking
                  ? "text-error bg-error/10 ring-red-400/30"
                  : warning
                    ? "text-amber-400 bg-amber-400/10 ring-amber-400/30"
                    : "text-emerald-400 bg-emerald-400/10 ring-emerald-400/30";
                return (
                  <div
                    key={week.weekStart}
                    className={`rounded-lg p-4 ring-1 ring-inset ${colorClass.replace("text-", "")}`}
                  >
                    <div className={`flex items-center justify-between text-xs font-mono ${colorClass.split(" ")[0]}`}>
                      <span>{week.weekStart}</span>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className={`mt-1 text-2xl font-bold ${colorClass.split(" ")[0]}`}>
                      {pct(week.saturationRatio, 0)}
                    </div>
                    <div className="text-[11px] text-foreground-secondary">
                      Seuil bloquant : {pct(SATURATION_BLOCKING)}
                    </div>
                    {week.bottlenecks.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {week.bottlenecks.map((b) => (
                          <div key={b.role} className="text-[10px] text-foreground-secondary">
                            <span className="font-mono">{b.role}</span> +{b.hoursOver}h/sem
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-surface p-8 text-center text-sm text-foreground-secondary ring-1 ring-inset ring-border">
              Pas de forecast disponible — capacity reader Imhotep non câblé (MVP placeholder)
            </div>
          )}
        </section>
      )}

      <footer className="rounded-lg bg-surface-secondary p-4 text-xs text-foreground-secondary ring-1 ring-inset ring-border">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Globe className="h-4 w-4" />
          Anonymisation par construction
        </div>
        <p className="mt-2">
          Les marges sont agrégées avec <strong>k-anonymity k≥5</strong> par bucket (catégorie × sub-type × marché ×
          période). Si un bucket contient moins de 5 tenants distincts, les valeurs <code>meanMargin</code> et{" "}
          <code>variance</code> sont mises à 0 et un code <code>K_ANONYMITY_VIOLATION_HIDDEN</code> est attaché — la
          rétro-identification d'un client unique est impossible. Promotion <code>MVP → PRODUCTION</code> via ADR enfant{" "}
          <a className="text-cyan-400 underline" href="/docs/governance/adr/0058-anonymization.md">
            ADR-0052-F
          </a>{" "}
          (data lake séparé non-joinable aux strategy IDs).
        </p>
      </footer>
    </div>
  );
}
