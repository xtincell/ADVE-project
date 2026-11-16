"use client";

import { trpc } from "@/lib/trpc/client";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { PILLAR_KEYS, PILLAR_NAMES, classifyBrand, type PillarKey, type BrandClassification } from "@/lib/types/advertis-vector";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { BrandComparablesPanel } from "@/components/shared/brand-comparables-panel";
import { DevelopmentGate } from "@/components/cockpit/development-gate";
import { AlertTriangle, BarChart3, Info, Medal, Target } from "lucide-react";

const CLASSIFICATION_LABELS: Record<BrandClassification, string> = {
  LATENT: "Latent", FRAGILE: "Fragile", ORDINAIRE: "Ordinaire", FORTE: "Forte", CULTE: "Culte", ICONE: "Icône",
};
const measured = (value: unknown, maximum = 200): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum;

export default function BenchmarksPage() {
  const strategyId = useCurrentStrategyId();
  const me = trpc.auth.me.useQuery();
  const canReadGlobal = !me.isError && !me.isLoading && me.data?.canOperate === true
    && (me.data.role === "ADMIN" || me.data.role === "OPERATOR");
  const strategyQuery = trpc.strategy.getWithScore.useQuery({ id: strategyId! }, { enabled: !!strategyId });
  const benchmarkQuery = trpc.knowledgeGraph.getBenchmarks.useQuery({}, { enabled: !!strategyId && canReadGlobal });
  const rankingQuery = trpc.knowledgeGraph.getFrameworkRanking.useQuery({}, { enabled: !!strategyId && canReadGlobal });

  if (!strategyId || strategyQuery.isLoading) return <SkeletonPage />;
  if (strategyQuery.error) return <div className="space-y-6">
    <PageHeader title="Benchmarks" />
    <div role="alert" className="rounded-xl border border-error/50 bg-error/20 p-6 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-error" />
      <p className="mt-2 text-sm text-error">{strategyQuery.error.message}</p>
    </div>
  </div>;

  const strategy = strategyQuery.data;
  const vector = (strategy?.advertis_vector as Record<string, unknown> | null) ?? {};
  const scores: Partial<Record<PillarKey, number>> = {};
  for (const key of PILLAR_KEYS) if (measured(vector[key], 25)) scores[key] = vector[key];
  const hasFullVector = PILLAR_KEYS.every(key => scores[key] !== undefined);
  const composite = measured(strategy?.composite) ? strategy.composite : null;
  const classification = composite === null ? null : classifyBrand(composite);

  // This request covers all active strategies, without selecting a sector.
  // A composite provides no evidence about the distribution of its eight pillars.
  const benchmark = benchmarkQuery.error ? undefined : benchmarkQuery.data;
  const average = measured(benchmark?.avgComposite) ? benchmark.avgComposite : null;
  const ranking = (rankingQuery.error ? [] : rankingQuery.data ?? [])
    .filter((row): row is typeof row & { composite: number } => measured(row.composite));
  const ownRankedScore = ranking.find(row => row.strategyId === strategyId)?.composite;
  const rank = ownRankedScore === undefined ? null : 1 + ranking.filter(row => row.composite > ownRankedScore).length;
  const tied = ownRankedScore !== undefined && ranking.filter(row => row.composite === ownRankedScore).length > 1;
  const distribution = (Object.entries(CLASSIFICATION_LABELS) as [BrandClassification, string][])
    .map(([key, label]) => ({ key, label, count: ranking.filter(row => classifyBrand(row.composite) === key).length }));
  const compositeDifference = composite !== null && average !== null ? composite - average : null;

  // The existing internal-preview gate remains until sector-specific comparisons are received.
  return <div className="space-y-6">
    <PageHeader title="Benchmarks" description="Vos scores et les repères disponibles parmi les marques actives observées"
      breadcrumbs={[{ label: "Cockpit", href: "/cockpit" }, { label: "Insights" }, { label: "Benchmarks" }]} />
    <DevelopmentGate feature="Le benchmark sectoriel">
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-background/50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground-secondary" />
          <p className="text-sm leading-relaxed text-foreground-secondary">
            Périmètre des repères : marques actives observées, tous secteurs, pays et échelles de marché confondus. Chaque moyenne par pilier indique le nombre de scores renseignés.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2"><StatCard title="Votre score" value={composite === null ? "—" : `${composite.toFixed(0)}/200`} icon={Target} />
            <p className="text-sm text-foreground-secondary">{classification === null ? "Pas encore évaluée" : CLASSIFICATION_LABELS[classification]}</p></div>
          <div className="space-y-2"><StatCard title="Moyenne des marques observées" value={average === null ? "—" : `${average.toFixed(0)}/200`} icon={BarChart3} />
            <p className="text-sm text-foreground-secondary">{benchmarkQuery.isLoading ? "Chargement…" : benchmark
              ? `${benchmark.coverage.observedCount}/${benchmark.count} marques avec un score` : "Comparaison indisponible"}</p></div>
          <div className="space-y-2"><StatCard title="Votre rang parmi les marques observées" value={rank === null ? "—" : `#${rank}`} icon={Medal} />
            <p className="text-sm text-foreground-secondary">{rankingQuery.isLoading ? "Chargement…" : rankingQuery.error ? "Classement indisponible" : rank === null ? "Votre marque n’est pas classée"
              : `sur ${ranking.length} marques classées${tied ? " · ex æquo" : ""}`}</p></div>
        </div>
        {compositeDifference !== null && <p className="text-sm text-foreground-secondary">
          Écart de votre score composite à la moyenne reçue : {compositeDifference > 0 ? "+" : ""}{compositeDifference.toFixed(1)} points.
        </p>}
        {benchmarkQuery.error && <p role="alert" className="text-sm text-error">La moyenne des marques observées est indisponible.</p>}
        {rankingQuery.error && <p role="alert" className="text-sm text-error">Le classement des marques observées est indisponible.</p>}

        <section aria-labelledby="brand-radar-title" className="rounded-xl border border-border bg-background/80 p-6">
          <h2 id="brand-radar-title" className="mb-4 font-semibold text-foreground">Profil de votre marque</h2>
          {hasFullVector ? <AdvertisRadar scores={scores} size={280} interactive={false} className="flex justify-center" />
            : <p className="text-sm text-foreground-secondary">Le radar sera disponible lorsque les huit piliers seront renseignés. Les valeurs déjà reçues figurent ci-dessous.</p>}
        </section>

        <section aria-labelledby="brand-pillar-scores-title" className="rounded-xl border border-border bg-background/80 p-6">
          <h2 id="brand-pillar-scores-title" className="mb-2 font-semibold text-foreground">Scores par pilier</h2>
          <p className="mb-4 text-sm text-foreground-secondary">Les moyennes utilisent les scores renseignés sur chaque pilier. Les valeurs absentes ou invalides sont exclues.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th scope="col" className="pb-3 text-left font-medium text-foreground-secondary">Pilier</th>
                <th scope="col" className="pb-3 text-right font-medium text-foreground-secondary">Votre score sur 25</th>
                <th scope="col" className="pb-3 pl-4 text-right font-medium text-foreground-secondary">Moyenne observée sur 25</th>
                <th scope="col" className="pb-3 pl-4 text-right font-medium text-foreground-secondary">Scores renseignés</th>
              </tr></thead>
              <tbody className="divide-y divide-border/50">
                {PILLAR_KEYS.map(key => {
                  const axis = benchmark?.pillarBenchmarks?.[key];
                  const mean = measured(axis?.average, 25) ? axis.average : null;
                  return <tr key={key}>
                    <th scope="row" className="py-3 text-left font-normal text-foreground-secondary">{key.toUpperCase()} — {PILLAR_NAMES[key]}</th>
                    <td className="py-3 text-right font-semibold text-foreground">{scores[key] === undefined ? "Non renseigné" : scores[key].toFixed(1)}</td>
                    <td className="py-3 pl-4 text-right text-foreground">{mean === null ? "Non disponible" : mean.toFixed(1)}</td>
                    <td className="py-3 pl-4 text-right text-foreground-secondary">{axis?.coverage ? `${axis.coverage.observedCount}/${axis.coverage.totalCount}` : "—"}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="observed-classifications-title" className="rounded-xl border border-border bg-background/80 p-6">
          <h2 id="observed-classifications-title" className="mb-2 font-semibold text-foreground">Répartition des marques classées</h2>
          {rankingQuery.isLoading ? <p className="text-sm text-foreground-secondary">Chargement du classement…</p>
            : ranking.length === 0 ? <p className="text-sm text-foreground-secondary">Répartition indisponible : aucun score composite reçu.</p>
            : <>
              <p className="mb-4 text-sm text-foreground-secondary">{ranking.length} scores composites reçus, tous secteurs confondus. Les marques sans score sont exclues.</p>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {distribution.map(item => <li key={item.key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                  <span className="text-sm text-foreground-secondary">{item.label}</span>
                  <span className="font-semibold text-foreground">{item.count}</span>
                </li>)}
              </ul>
            </>}
        </section>
        <BrandComparablesPanel strategyId={strategyId} topK={6} />
      </div>
    </DevelopmentGate>
  </div>;
}
