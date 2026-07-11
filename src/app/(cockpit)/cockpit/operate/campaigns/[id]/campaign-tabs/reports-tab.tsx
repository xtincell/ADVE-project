"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Section, EmptyMsg } from "./shared";
import { BarChart3, Briefcase, DollarSign, Download, FileText, MapPin, Megaphone, Sparkles } from "lucide-react";

export function ReportsTab({ campaignId }: { campaignId: string }) {
  const [generating, setGenerating] = useState<string | null>(null);

  const reportsQuery = trpc.campaignManager.listReports.useQuery({ campaignId });
  const generateMut = trpc.campaignManager.generateReport.useMutation({
    onSuccess: () => { reportsQuery.refetch(); setGenerating(null); },
    onError: () => setGenerating(null),
  });

  const reports = (reportsQuery.data ?? []) as Array<Record<string, unknown>>;

  const REPORT_TYPES = [
    { type: "PERFORMANCE", label: "Performance", icon: BarChart3 },
    { type: "BUDGET", label: "Budget", icon: DollarSign },
    { type: "EXECUTIVE", label: "Executif", icon: Briefcase },
    { type: "CREATIVE", label: "Creatif", icon: Sparkles },
    { type: "MEDIA", label: "Media", icon: Megaphone },
    { type: "FIELD", label: "Terrain", icon: MapPin },
  ];

  return (
    <div className="space-y-5">
      {/* Generate reports */}
      <Section title="Generer un rapport" icon={FileText}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REPORT_TYPES.map((rt) => {
            const Icon = rt.icon;
            return (
              <button
                key={rt.type}
                onClick={() => { setGenerating(rt.type); generateMut.mutate({ campaignId, reportType: rt.type as any, title: `Rapport ${rt.label} — ${new Date().toLocaleDateString("fr-FR")}` }); }}
                disabled={generating === rt.type}
                className="flex items-center gap-2 rounded-lg border border-border bg-background/50 p-3 text-left transition-colors hover:border-border disabled:opacity-50"
              >
                <Icon className="h-4 w-4 text-foreground-secondary" />
                <div>
                  <p className="text-xs font-medium text-white">{rt.label}</p>
                  <p className="text-2xs text-foreground-muted">{generating === rt.type ? "Generation..." : "Cliquer pour generer"}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Reports list */}
      <Section title={`Rapports generes (${reports.length})`} icon={FileText}>
        {reportsQuery.isLoading ? <EmptyMsg text="Chargement..." /> : reports.length === 0 ? (
          <EmptyMsg text="Aucun rapport genere." />
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id as string} className="rounded-lg border border-border bg-background/50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-info/15 px-1.5 py-0.5 text-2xs font-bold text-info">{r.type as string}</span>
                      <h4 className="text-sm font-medium text-white">{(r.title as string) ?? `Rapport ${(r.id as string).slice(0, 8)}`}</h4>
                    </div>
                    <p className="mt-0.5 text-xs text-foreground-muted">
                      {r.createdAt ? new Date(r.createdAt as string).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : ""}
                    </p>
                  </div>
                  {!!r.url && (
                    <a href={r.url as string} target="_blank" rel="noopener noreferrer" className="text-info hover:text-info">
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
                {!!r.summary && (
                  <p className="mt-2 text-xs text-foreground-secondary line-clamp-3">{r.summary as string}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
