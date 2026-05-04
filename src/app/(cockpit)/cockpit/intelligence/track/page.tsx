"use client";

/**
 * Cockpit — Intelligence > Track (49 variables ADVE GEN)
 *
 * Affiche le Trend Tracker 49 (canon Workflow ADVE GEN) avec les valeurs
 * réelles ingérées depuis les études de marché (PR-J + PR-I).
 * Cf. ADR-0037 §13 + PR-J étendu.
 */

import { useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { TrendingUp, Database, Filter, Globe2 } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  MACRO_ECO: "Macro Économique",
  MACRO_TECH: "Macro Technologique",
  SOCIO_CULT: "Socio-Culturel",
  REGUL_INST: "Régul. & Institutionnel",
  MICRO_SECTOR: "Micro Sectoriel",
};

export default function TrackPage() {
  const strategyId = useCurrentStrategyId();
  const strategy = trpc.strategy.get.useQuery(
    { id: strategyId ?? "" },
    { enabled: !!strategyId },
  );
  const countryCode = strategy.data?.countryCode ?? null;
  const sector = (strategy.data?.businessContext as { sector?: string } | null)?.sector ?? null;

  const tracker = trpc.marketStudyIngestion.getTrendTrackerForCountrySector.useQuery(
    { countryCode: countryCode ?? "", sector: sector ?? "" },
    { enabled: !!countryCode && !!sector },
  );
  const intel = trpc.marketStudyIngestion.loadCountrySectorIntelligence.useQuery(
    { countryCode: countryCode ?? "", sector: sector ?? "" },
    { enabled: !!countryCode && !!sector },
  );

  const grouped = useMemo(() => {
    if (!tracker.data) return null;
    const out: Record<string, typeof tracker.data.catalog> = {};
    for (const v of tracker.data.catalog) {
      out[v.category] ??= [];
      out[v.category]!.push(v);
    }
    return out;
  }, [tracker.data]);

  if (!strategyId) {
    return <div className="p-6 text-foreground-muted">Sélectionne une stratégie pour voir le Trend Tracker.</div>;
  }
  if (!countryCode || !sector) {
    return (
      <div className="p-6">
        <PageHeader title="Trend Tracker — 49 variables" description="Pilier T canon ADVE GEN." />
        <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
          Cette stratégie n'a pas de <code>countryCode</code> ou de <code>businessContext.sector</code> renseigné.
          Renseigne-les pour activer le Trend Tracker.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Trend Tracker — 49 variables"
        description={`Canon Workflow ADVE GEN appliqué à ${countryCode} · ${sector}. Les valeurs proviennent des études de marché ingérées (Statista, Nielsen, Kantar…). Les cellules vides signalent une variable non couverte par les études — opportunité d'injecter une nouvelle source.`}
      />

      {/* Stats top */}
      <div className="grid grid-cols-4 gap-3">
        <Card icon={<Globe2 className="h-4 w-4" />} label="Pays" value={countryCode} />
        <Card icon={<Filter className="h-4 w-4" />} label="Secteur" value={sector} />
        <Card icon={<TrendingUp className="h-4 w-4" />} label="Couverture Trend Tracker" value={tracker.data ? `${tracker.data.coveragePct}%` : "…"} />
        <Card icon={<Database className="h-4 w-4" />} label="Études ingérées" value={intel.data ? String(intel.data.competitors.length + intel.data.segments.length + (intel.data.tamSamSom ? 1 : 0)) : "…"} />
      </div>

      {/* Trend Tracker table */}
      {tracker.isLoading || !grouped ? (
        <div className="text-foreground-muted">Chargement Trend Tracker…</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, vars]) => (
            <section key={cat}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-rocket-red">
                {CATEGORY_LABELS[cat] ?? cat} ({vars.length})
              </h3>
              <div className="overflow-x-auto rounded-lg border border-white/8">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-foreground-muted">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Code</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Variable</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Unité</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Valeur ingérée</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Année</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vars.map((v) => {
                      const value = tracker.data?.values?.[v.code];
                      return (
                        <tr key={v.code} className="border-t border-white/5">
                          <td className="px-3 py-2 font-mono text-xs text-rocket-red">{v.code}</td>
                          <td className="px-3 py-2 text-white">{v.label}</td>
                          <td className="px-3 py-2 text-xs text-foreground-muted">{v.unit}</td>
                          <td className="px-3 py-2">
                            {value && value.value != null ? (
                              <span className="font-semibold text-emerald-300">{String(value.value)}</span>
                            ) : (
                              <span className="text-foreground-muted/40">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-foreground-muted">
                            {value?.year ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-xs text-foreground-muted">
                            {value?.source ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* TAM / Concurrents / Segments — synthèse */}
      {intel.data ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-rocket-red">Synthèse études ingérées</h3>
          <div className="grid grid-cols-3 gap-3">
            {intel.data.tamSamSom ? (
              <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3 text-xs">
                <p className="font-semibold text-white">TAM</p>
                <p className="mt-1 text-emerald-300">{intel.data.tamSamSom.tam.value} {intel.data.tamSamSom.tam.currency ?? ""} ({intel.data.tamSamSom.tam.year})</p>
                {intel.data.tamSamSom.sam ? <p className="text-foreground-muted">SAM : {intel.data.tamSamSom.sam.value}</p> : null}
                {intel.data.tamSamSom.som ? <p className="text-foreground-muted">SOM : {intel.data.tamSamSom.som.value}</p> : null}
              </div>
            ) : null}
            {intel.data.competitors.length > 0 ? (
              <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3 text-xs">
                <p className="font-semibold text-white">Concurrents (parts marché)</p>
                <ul className="mt-1 space-y-1">
                  {intel.data.competitors.slice(0, 5).map((c, i) => (
                    <li key={i}><span className="text-foreground-muted">{c.name} :</span> <span className="text-emerald-300">{c.marketSharePct ?? "?"}%</span></li>
                  ))}
                </ul>
              </div>
            ) : null}
            {intel.data.segments.length > 0 ? (
              <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3 text-xs">
                <p className="font-semibold text-white">Segments consommateurs</p>
                <ul className="mt-1 space-y-1">
                  {intel.data.segments.slice(0, 5).map((s, i) => (
                    <li key={i}><span className="text-foreground-muted">{s.segment} :</span> <span className="text-emerald-300">{s.sizePct}%</span></li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Card({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 text-xs text-foreground-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
