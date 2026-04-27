"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Modal } from "@/components/shared/modal";
import { EmptyState } from "@/components/shared/empty-state";
import { AiBadge } from "@/components/shared/ai-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { PILLAR_KEYS, PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import {
  FileText,
  TrendingUp,
  Calendar,
  Download,
  Plus,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

interface ReportItem {
  period: string;
  scoreEvolution: number;
  highlights: string[];
  pillarScores: Partial<Record<PillarKey, number>>;
  previousPillarScores: Partial<Record<PillarKey, number>>;
  recommendations: string[];
  generatedAt: string;
}

function buildReportText(report: ReportItem): string {
  const lines: string[] = [];
  lines.push(`Rapport de Valeur - ${report.period}`);
  lines.push(`Genere le: ${new Date(report.generatedAt).toLocaleDateString("fr-FR")}`);
  lines.push(`Evolution du score composite: ${report.scoreEvolution >= 0 ? "+" : ""}${report.scoreEvolution.toFixed(1)} points`);
  lines.push("");
  lines.push("--- Analyse par pilier ---");
  for (const key of PILLAR_KEYS) {
    const current = report.pillarScores[key] ?? 0;
    const previous = report.previousPillarScores[key] ?? 0;
    const diff = current - previous;
    lines.push(`${key.toUpperCase()} (${PILLAR_NAMES[key]}): ${current.toFixed(1)}/25 (${diff >= 0 ? "+" : ""}${diff.toFixed(1)})`);
  }
  if (report.highlights.length > 0) {
    lines.push("");
    lines.push("--- Points cles ---");
    report.highlights.forEach((h) => lines.push(`- ${h}`));
  }
  if (report.recommendations.length > 0) {
    lines.push("");
    lines.push("--- Recommandations ---");
    report.recommendations.forEach((r) => lines.push(`- ${r}`));
  }
  return lines.join("\n");
}

function buildReportHtml(report: ReportItem): string {
  const pillarRows = PILLAR_KEYS.map((key) => {
    const current = report.pillarScores[key] ?? 0;
    const previous = report.previousPillarScores[key] ?? 0;
    const diff = current - previous;
    const color = diff > 0 ? "green" : diff < 0 ? "red" : "gray";
    return `<tr><td><strong>${key.toUpperCase()}</strong> ${PILLAR_NAMES[key]}</td><td>${current.toFixed(1)}/25</td><td style="color:${color}">${diff >= 0 ? "+" : ""}${diff.toFixed(1)}</td></tr>`;
  }).join("");

  const highlights = report.highlights.length > 0
    ? `<h3>Points cles</h3><ul>${report.highlights.map((h) => `<li>${h}</li>`).join("")}</ul>`
    : "";

  const recommendations = report.recommendations.length > 0
    ? `<h3>Recommandations</h3><ul>${report.recommendations.map((r) => `<li>${r}</li>`).join("")}</ul>`
    : "";

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Rapport ${report.period}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;color:#333}table{width:100%;border-collapse:collapse;margin:1rem 0}td,th{border:1px solid #ddd;padding:8px;text-align:left}h1{color:#1a1a2e}h3{margin-top:1.5rem}</style></head>
<body><h1>Rapport de Valeur - ${report.period}</h1>
<p>Genere le ${new Date(report.generatedAt).toLocaleDateString("fr-FR")}</p>
<h2>Evolution: ${report.scoreEvolution >= 0 ? "+" : ""}${report.scoreEvolution.toFixed(1)} points</h2>
<h3>Analyse par pilier</h3><table><tr><th>Pilier</th><th>Score</th><th>Evolution</th></tr>${pillarRows}</table>
${highlights}${recommendations}</body></html>`;
}

export default function ReportsPage() {
  const strategyId = useCurrentStrategyId();
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [generatePeriod, setGeneratePeriod] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const reportsQuery = trpc.valueReport.list.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  const generateMutation = trpc.valueReport.generate.useMutation({
    onSuccess: () => {
      reportsQuery.refetch();
    },
  });

  if (!strategyId || reportsQuery.isLoading) {
    return <SkeletonPage />;
  }

  if (reportsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Rapports de Valeur" />
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-2 text-sm text-red-300">
            {reportsQuery.error.message}
          </p>
        </div>
      </div>
    );
  }

  const reports: ReportItem[] = (reportsQuery.data ?? []).map((r: Record<string, unknown>) => ({
    period: (r.period as string) ?? "",
    scoreEvolution: (r.scoreEvolution as number) ?? 0,
    highlights: (r.highlights as string[]) ?? [],
    pillarScores: (r.pillarScores as Partial<Record<PillarKey, number>>) ?? {},
    previousPillarScores: (r.previousPillarScores as Partial<Record<PillarKey, number>>) ?? {},
    recommendations: (r.recommendations as string[]) ?? [],
    generatedAt: (r.generatedAt as string) ?? new Date().toISOString(),
  }));

  const latestDate = reports.length > 0 ? reports[0]!.generatedAt : null;
  const avgEvolution =
    reports.length > 0
      ? reports.reduce((s, r) => s + r.scoreEvolution, 0) / reports.length
      : 0;

  const handleGenerate = () => {
    if (!strategyId) return;
    generateMutation.mutate({ strategyId, period: generatePeriod });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports de Valeur"
        description="Rapports mensuels d'impact et de ROI de votre marque"
        badge={<AiBadge />}
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Insights" },
          { label: "Rapports" },
        ]}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Rapports generes"
          value={reports.length}
          trend="flat"
          trendValue={`${reports.length} rapport${reports.length > 1 ? "s" : ""}`}
          icon={FileText}
        />
        <StatCard
          title="Evolution moy. du score"
          value={`${avgEvolution >= 0 ? "+" : ""}${avgEvolution.toFixed(1)}`}
          trend={avgEvolution > 0 ? "up" : avgEvolution < 0 ? "down" : "flat"}
          trendValue="pts composite"
          icon={TrendingUp}
        />
        <StatCard
          title="Dernier rapport"
          value={latestDate ? new Date(latestDate).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "Aucun"}
          trend="flat"
          trendValue=""
          icon={Calendar}
        />
      </div>

      {/* Generate action */}
      <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">Generer un nouveau rapport</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Selectionnez la periode et lancez la generation du rapport de valeur.
          </p>
        </div>
        <input
          type="month"
          value={generatePeriod}
          onChange={(e) => setGeneratePeriod(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
        />
        <button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {generateMutation.isPending ? "Generation..." : "Generer un Rapport"}
        </button>
      </div>

      {/* Reports list */}
      {reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun rapport"
          description="Generez votre premier rapport de valeur pour suivre l'evolution de votre marque."
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report, idx) => (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedReport(report)}
              onKeyDown={(e) => { if (e.key === "Enter") setSelectedReport(report); }}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 text-left transition-colors hover:border-zinc-700 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800">
                    <FileText className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Rapport{" "}
                      {new Date(report.period + "-01").toLocaleDateString("fr-FR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Genere le{" "}
                      {new Date(report.generatedAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      report.scoreEvolution > 0
                        ? "bg-emerald-400/10 text-emerald-400"
                        : report.scoreEvolution < 0
                          ? "bg-red-400/10 text-red-400"
                          : "bg-zinc-400/10 text-zinc-400"
                    }`}
                  >
                    {report.scoreEvolution >= 0 ? "+" : ""}
                    {report.scoreEvolution.toFixed(1)} pts
                  </span>
                  {report.highlights.length > 0 && (
                    <span className="text-xs text-zinc-500">
                      {report.highlights.length} points cles
                    </span>
                  )}
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const content = buildReportText(report);
                        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `rapport-${report.period}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      <Download className="inline h-3 w-3" /> PDF
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const html = buildReportHtml(report);
                        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `rapport-${report.period}.html`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      <Download className="inline h-3 w-3" /> HTML
                    </button>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report detail modal */}
      <Modal
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={
          selectedReport
            ? `Rapport ${new Date(selectedReport.period + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`
            : ""
        }
        size="lg"
      >
        {selectedReport && (
          <div className="space-y-6">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <p className="text-sm font-medium text-zinc-400">
                Evolution du score composite
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  selectedReport.scoreEvolution >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {selectedReport.scoreEvolution >= 0 ? "+" : ""}
                {selectedReport.scoreEvolution.toFixed(1)} points
              </p>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-medium text-zinc-400">
                Analyse par pilier
              </h4>
              <div className="space-y-2">
                {PILLAR_KEYS.map((key) => {
                  const current = selectedReport.pillarScores[key] ?? 0;
                  const previous = selectedReport.previousPillarScores[key] ?? 0;
                  const diff = current - previous;
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-xs font-bold text-white">
                        {key.toUpperCase()}
                      </span>
                      <span className="w-28 text-sm text-zinc-300">
                        {PILLAR_NAMES[key]}
                      </span>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{ width: `${(current / 25) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-12 text-right text-sm text-zinc-300">
                        {current.toFixed(1)}
                      </span>
                      <span
                        className={`w-16 text-right text-xs font-semibold ${
                          diff > 0
                            ? "text-emerald-400"
                            : diff < 0
                              ? "text-red-400"
                              : "text-zinc-500"
                        }`}
                      >
                        {diff >= 0 ? "+" : ""}
                        {diff.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedReport.highlights.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-400">Points cles</h4>
                <ul className="space-y-2">
                  {selectedReport.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-violet-400" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedReport.recommendations.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-400">Recommandations</h4>
                <ul className="space-y-2">
                  {selectedReport.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm text-zinc-300">
                      <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
